"""Supabase Storage client — owner-scoped object keys + service-role uploads."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import httpx

from app.core.config import Settings, get_settings
from app.domain.errors import ValidationDomainError


@dataclass(frozen=True, slots=True)
class StoragePaths:
    """Object key conventions for Supabase Storage buckets."""

    datasets: str
    models: str
    reports: str


def storage_paths(settings: Settings | None = None) -> StoragePaths:
    cfg = settings or get_settings()
    return StoragePaths(
        datasets=cfg.storage_bucket_datasets,
        models=cfg.storage_bucket_models,
        reports=cfg.storage_bucket_reports,
    )


def object_key(
    *,
    user_id: UUID,
    project_id: UUID,
    workspace_id: UUID | None,
    filename: str,
) -> str:
    """Build owner-scoped storage key: {user_id}/{project_id}/[workspace_id/]{filename}."""
    parts = [str(user_id), str(project_id)]
    if workspace_id is not None:
        parts.append(str(workspace_id))
    parts.append(filename.lstrip("/"))
    return "/".join(parts)


class SupabaseStorage:
    """Minimal Storage REST client using the service role key (server-side only)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        if not self._settings.supabase_url or not self._settings.supabase_service_role_key:
            raise ValidationDomainError("Supabase Storage is not configured")

    def _headers(self, *, content_type: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._settings.supabase_service_role_key}",
            "apikey": self._settings.supabase_service_role_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def _object_url(self, bucket: str, path: str) -> str:
        from urllib.parse import quote

        base = self._settings.supabase_url.rstrip("/")
        safe = "/".join(quote(seg, safe="") for seg in path.split("/") if seg)
        return f"{base}/storage/v1/object/{bucket}/{safe}"

    async def upload(
        self,
        *,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str,
        upsert: bool = True,
    ) -> None:
        url = self._object_url(bucket, path)
        headers = self._headers(content_type=content_type)
        if upsert:
            headers["x-upsert"] = "true"
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, content=data, headers=headers)
            if response.status_code >= 400:
                raise ValidationDomainError(
                    f"Storage upload failed ({response.status_code}): {response.text[:300]}"
                )

    async def download(self, *, bucket: str, path: str) -> bytes:
        url = self._object_url(bucket, path)
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(url, headers=self._headers())
            if response.status_code >= 400:
                raise ValidationDomainError(
                    f"Storage download failed ({response.status_code}): {response.text[:300]}"
                )
            return response.content

    def download_sync(self, *, bucket: str, path: str) -> bytes:
        url = self._object_url(bucket, path)
        with httpx.Client(timeout=120.0) as client:
            response = client.get(url, headers=self._headers())
            if response.status_code >= 400:
                raise ValidationDomainError(
                    f"Storage download failed ({response.status_code}): {response.text[:300]}"
                )
            return response.content

    def upload_sync(
        self,
        *,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str,
        upsert: bool = True,
    ) -> None:
        url = self._object_url(bucket, path)
        headers = self._headers(content_type=content_type)
        if upsert:
            headers["x-upsert"] = "true"
        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, content=data, headers=headers)
            if response.status_code >= 400:
                raise ValidationDomainError(
                    f"Storage upload failed ({response.status_code}): {response.text[:300]}"
                )

    async def delete(self, *, bucket: str, path: str) -> None:
        base = self._settings.supabase_url.rstrip("/")
        url = f"{base}/storage/v1/object/{bucket}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                "DELETE",
                url,
                headers=self._headers(content_type="application/json"),
                json={"prefixes": [path]},
            )
            # Ignore missing objects during soft-delete GC
            if response.status_code >= 400 and response.status_code != 404:
                raise ValidationDomainError(
                    f"Storage delete failed ({response.status_code}): {response.text[:300]}"
                )
