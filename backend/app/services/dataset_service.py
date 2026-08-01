"""Dataset upload, profiling orchestration, preview, and EDA."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.storage import SupabaseStorage, object_key, storage_paths
from app.domain.entities import Dataset, DatasetMetadata, DatasetVersion, Job
from app.domain.errors import NotFoundError, PayloadTooLargeError, ValidationDomainError
from app.repositories.dataset_repo import DatasetRepository
from app.repositories.job_repo import JobRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository

MIME_BY_EXT = {
    "csv": "text/csv",
    "parquet": "application/vnd.apache.parquet",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
}


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._")
    return cleaned[:180] or "dataset.csv"


class DatasetService:
    def __init__(
        self,
        dataset_repo: DatasetRepository,
        workspace_repo: WorkspaceRepository,
        project_repo: ProjectRepository,
        job_repo: JobRepository,
        session: AsyncSession | None = None,
        settings: Settings | None = None,
        storage: SupabaseStorage | None = None,
    ) -> None:
        self._datasets = dataset_repo
        self._workspaces = workspace_repo
        self._projects = project_repo
        self._jobs = job_repo
        self._session = session
        self._settings = settings or get_settings()
        self._storage = storage

    def _get_storage(self) -> SupabaseStorage:
        if self._storage is None:
            self._storage = SupabaseStorage(self._settings)
        return self._storage

    def _allowed_extensions(self) -> set[str]:
        return {
            e.strip().lower().lstrip(".")
            for e in self._settings.upload_allowed_extensions.split(",")
            if e.strip()
        }

    def _detect_format(self, filename: str) -> str:
        ext = Path(filename).suffix.lower().lstrip(".")
        if ext == "pq":
            ext = "parquet"
        allowed = self._allowed_extensions()
        if ext not in allowed:
            raise ValidationDomainError(
                f"Unsupported file type '.{ext or '?'}'. Allowed: {', '.join(sorted(allowed))}"
            )
        return ext

    async def list_project_datasets(
        self, project_id: UUID, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Dataset], int]:
        project = await self._projects.get(project_id, user_id)
        if project is None:
            raise NotFoundError("Project not found")
        return await self._datasets.list_for_project(
            project_id, user_id, limit=limit, offset=offset
        )

    async def list_workspace_versions(
        self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[DatasetVersion], int]:
        workspace = await self._workspaces.get(workspace_id, user_id)
        if workspace is None:
            raise NotFoundError("Workspace not found")
        return await self._datasets.list_versions_for_workspace(
            workspace_id, user_id, limit=limit, offset=offset
        )

    async def get_version(self, version_id: UUID, user_id: UUID) -> DatasetVersion:
        version = await self._datasets.get_version(version_id, user_id)
        if version is None:
            raise NotFoundError("Dataset version not found")
        return version

    async def get_metadata(self, version_id: UUID, user_id: UUID) -> DatasetMetadata:
        await self.get_version(version_id, user_id)
        meta = await self._datasets.get_metadata(version_id, user_id)
        if meta is None:
            raise NotFoundError("Dataset metadata not ready yet")
        return meta

    async def upload_to_workspace(
        self,
        workspace_id: UUID,
        user_id: UUID,
        *,
        filename: str,
        content: bytes,
        content_type: str | None = None,
        dataset_name: str | None = None,
    ) -> tuple[Dataset, DatasetVersion, Job]:
        workspace = await self._workspaces.get(workspace_id, user_id)
        if workspace is None:
            raise NotFoundError("Workspace not found")

        if not content:
            raise ValidationDomainError("Uploaded file is empty")
        if len(content) > self._settings.upload_max_bytes:
            raise PayloadTooLargeError(
                f"File exceeds max upload size of {self._settings.upload_max_bytes} bytes"
            )

        fmt = self._detect_format(filename)
        safe_name = _safe_filename(filename)
        content_hash = hashlib.sha256(content).hexdigest()
        mime = content_type or MIME_BY_EXT.get(fmt)
        bucket = storage_paths(self._settings).datasets
        placeholder_path = object_key(
            user_id=user_id,
            project_id=workspace.project_id,
            workspace_id=workspace_id,
            filename=f"pending/{uuid4()}_{safe_name}",
        )

        # Persist rows first (uploading), then Storage, then enqueue profile.
        dataset = await self._datasets.create(
            project_id=workspace.project_id,
            user_id=user_id,
            name=(dataset_name or Path(safe_name).stem or "dataset")[:200],
            storage_path=placeholder_path,
            format=fmt,
            mime_type=mime,
            original_filename=safe_name,
            size_bytes=len(content),
            content_hash=content_hash,
            status="uploading",
        )
        version_number = await self._datasets.next_version_number(workspace_id, dataset.id)
        storage_filename = f"{dataset.id}/v{version_number}_{safe_name}"
        path = object_key(
            user_id=user_id,
            project_id=workspace.project_id,
            workspace_id=workspace_id,
            filename=storage_filename,
        )
        await self._datasets.update_status(dataset.id, status="uploading", storage_path=path)

        version = await self._datasets.create_version(
            workspace_id=workspace_id,
            dataset_id=dataset.id,
            project_id=workspace.project_id,
            user_id=user_id,
            version_number=version_number,
            storage_path=path,
            content_hash=content_hash,
            label=f"v{version_number}",
            status="profiling",
        )

        try:
            await self._get_storage().upload(
                bucket=bucket,
                path=path,
                data=content,
                content_type=mime or "application/octet-stream",
                upsert=True,
            )
        except Exception:
            await self._datasets.update_status(dataset.id, status="failed")
            await self._datasets.update_version_status(version.id, "failed")
            if self._session is not None:
                await self._session.commit()
            raise

        await self._datasets.update_status(dataset.id, status="profiling", storage_path=path)
        if self._session is not None:
            await self._session.commit()

        job = await self._enqueue_profile_job(
            user_id=user_id,
            project_id=workspace.project_id,
            workspace_id=workspace_id,
            dataset_id=dataset.id,
            version_id=version.id,
        )
        refreshed_dataset = await self._datasets.get(dataset.id, user_id)
        refreshed_version = await self._datasets.get_version(version.id, user_id)
        if refreshed_dataset is None or refreshed_version is None:
            raise ValidationDomainError("Failed to finalize upload")
        return refreshed_dataset, refreshed_version, job

    async def _enqueue_profile_job(
        self,
        *,
        user_id: UUID,
        project_id: UUID,
        workspace_id: UUID,
        dataset_id: UUID,
        version_id: UUID,
    ) -> Job:
        job = await self._jobs.create(
            user_id=user_id,
            project_id=project_id,
            workspace_id=workspace_id,
            job_type="profile_dataset",
            input_json={
                "dataset_id": str(dataset_id),
                "dataset_version_id": str(version_id),
            },
        )
        if self._session is not None:
            await self._session.commit()

        from app.workers.tasks import profile_dataset_task

        async_result = profile_dataset_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        if self._session is not None:
            await self._session.commit()
        refreshed = await self._jobs.get(job.id, user_id)
        if refreshed is None:
            raise ValidationDomainError("Failed to enqueue profiling job")
        return refreshed

    async def enqueue_eda(
        self, version_id: UUID, user_id: UUID
    ) -> tuple[DatasetVersion, Job]:
        version = await self.get_version(version_id, user_id)
        if version.status not in {"ready", "profiling", "failed"}:
            raise ValidationDomainError("Dataset version is not available for EDA")

        job = await self._jobs.create(
            user_id=user_id,
            project_id=version.project_id,
            workspace_id=version.workspace_id,
            job_type="eda",
            input_json={"dataset_version_id": str(version.id)},
        )
        if self._session is not None:
            await self._session.commit()

        from app.workers.tasks import eda_dataset_task

        async_result = eda_dataset_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        if self._session is not None:
            await self._session.commit()
        refreshed = await self._jobs.get(job.id, user_id)
        if refreshed is None:
            raise ValidationDomainError("Failed to enqueue EDA job")
        return version, refreshed

    async def preview(
        self, version_id: UUID, user_id: UUID, *, limit: int | None = None
    ) -> dict[str, Any]:
        version = await self.get_version(version_id, user_id)
        row_limit = min(limit or self._settings.upload_preview_rows, 200)
        bucket = storage_paths(self._settings).datasets
        try:
            content = await self._get_storage().download(
                bucket=bucket, path=version.storage_path
            )
        except Exception as exc:  # noqa: BLE001
            raise ValidationDomainError(f"Failed to download dataset for preview: {exc}") from exc

        from syntrix_ml.io import load_tabular

        dataset = await self._datasets.get(version.dataset_id, user_id)
        filename = (
            (dataset.original_filename if dataset else None)
            or version.storage_path.rsplit("/", 1)[-1]
            or "data.csv"
        )
        # Ensure extension is present for format detection
        if "." not in filename and dataset and dataset.format:
            filename = f"{filename}.{dataset.format}"
        try:
            df = load_tabular(content, filename=filename, nrows=row_limit)
        except Exception as exc:  # noqa: BLE001
            raise ValidationDomainError(f"Failed to parse dataset preview: {exc}") from exc

        # Strip Excel formula-like cells in object columns
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].map(_strip_formula)

        columns = [str(c) for c in df.columns.tolist()]
        # Use pandas JSON roundtrip for safe serialization of NA/numpy types
        records = json.loads(df.to_json(orient="records", date_format="iso"))
        rows = []
        for record in records:
            cleaned: dict[str, Any] = {}
            for key, value in record.items():
                cell = _json_cell(value)
                cleaned[str(key)] = cell
            rows.append(cleaned)
        return {
            "dataset_version_id": version.id,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "truncated": len(rows) >= row_limit,
        }

    async def soft_delete_dataset(self, dataset_id: UUID, user_id: UUID) -> None:
        deleted = await self._datasets.soft_delete(dataset_id, user_id)
        if deleted is None:
            raise NotFoundError("Dataset not found")
        if self._session is not None:
            await self._session.commit()


def _strip_formula(value: Any) -> Any:
    try:
        if value is None:
            return None
        if isinstance(value, str) and value[:1] in {"=", "+", "@"}:
            return "'" + value
    except Exception:  # noqa: BLE001
        return value
    return value


def _json_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        if isinstance(value, float):
            import math

            if math.isnan(value) or math.isinf(value):
                return None
        return value
    try:
        import numpy as np
        import pandas as pd

        if isinstance(value, (np.floating, np.integer, np.bool_)):
            return value.item()
        if isinstance(value, pd.Timestamp):
            return value.isoformat()
        with pd.option_context("mode.use_inf_as_na", True):
            if value is pd.NA or (not isinstance(value, (list, dict)) and pd.isna(value)):
                return None
    except Exception:  # noqa: BLE001
        pass
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:  # noqa: BLE001
            return str(value)
    return str(value)
