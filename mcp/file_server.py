"""MCP File server — sandboxed Supabase Storage access with capability tokens."""

from __future__ import annotations

import hashlib
import hmac
import os
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass
class CapabilityToken:
    user_id: str
    workspace_id: str
    scopes: frozenset[str]
    signature: str

    def allows(self, scope: str) -> bool:
        return scope in self.scopes


def issue_capability(
    *,
    user_id: str,
    workspace_id: str,
    scopes: list[str],
    secret: str | None = None,
) -> CapabilityToken:
    secret = secret or os.getenv("SUPABASE_JWT_SECRET", "dev-secret")
    scope_str = ",".join(sorted(scopes))
    msg = f"{user_id}:{workspace_id}:{scope_str}".encode()
    sig = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
    return CapabilityToken(user_id, workspace_id, frozenset(scopes), sig)


def verify_capability(token: CapabilityToken, secret: str | None = None) -> bool:
    expected = issue_capability(
        user_id=token.user_id,
        workspace_id=token.workspace_id,
        scopes=list(token.scopes),
        secret=secret,
    )
    return hmac.compare_digest(expected.signature, token.signature)


class FileMCP:
    """Minimal File MCP: list/read/write under {user_id}/... prefix only."""

    def __init__(self, token: CapabilityToken) -> None:
        if not verify_capability(token):
            raise PermissionError("Invalid capability token")
        self.token = token
        self.base = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.bucket = os.getenv("STORAGE_BUCKET_DATASETS", "datasets")

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.key}", "apikey": self.key}

    def _assert_path(self, path: str) -> str:
        clean = path.lstrip("/")
        if not clean.startswith(f"{self.token.user_id}/"):
            raise PermissionError("Path escapes owner prefix")
        if self.token.workspace_id not in clean:
            raise PermissionError("Path not scoped to workspace")
        return clean

    def read_file(self, path: str) -> bytes:
        if not self.token.allows("files:read"):
            raise PermissionError("Missing files:read scope")
        clean = self._assert_path(path)
        url = f"{self.base}/storage/v1/object/{self.bucket}/{clean}"
        with httpx.Client(timeout=60) as client:
            r = client.get(url, headers=self._headers())
            r.raise_for_status()
            return r.content

    def write_file(self, path: str, data: bytes, content_type: str = "application/octet-stream") -> dict[str, Any]:
        if not self.token.allows("files:write"):
            raise PermissionError("Missing files:write scope")
        clean = self._assert_path(path)
        url = f"{self.base}/storage/v1/object/{self.bucket}/{clean}"
        headers = {**self._headers(), "Content-Type": content_type, "x-upsert": "true"}
        with httpx.Client(timeout=60) as client:
            r = client.post(url, content=data, headers=headers)
            r.raise_for_status()
        return {"path": clean, "bytes": len(data)}
