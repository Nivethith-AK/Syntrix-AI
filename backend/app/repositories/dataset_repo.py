"""Dataset / version / metadata persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Dataset, DatasetMetadata, DatasetVersion
from app.repositories.models import DatasetMetadataRow, DatasetRow, DatasetVersionRow


def _dataset(row: DatasetRow) -> Dataset:
    return Dataset(
        id=row.id,
        project_id=row.project_id,
        user_id=row.user_id,
        name=row.name,
        storage_path=row.storage_path,
        format=row.format,
        mime_type=row.mime_type,
        original_filename=row.original_filename,
        size_bytes=int(row.size_bytes or 0),
        status=str(row.status),
        content_hash=row.content_hash,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
    )


def _version(row: DatasetVersionRow) -> DatasetVersion:
    return DatasetVersion(
        id=row.id,
        workspace_id=row.workspace_id,
        dataset_id=row.dataset_id,
        project_id=row.project_id,
        user_id=row.user_id,
        version_number=row.version_number,
        label=row.label,
        storage_path=row.storage_path,
        content_hash=row.content_hash,
        status=str(row.status),
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _metadata(row: DatasetMetadataRow) -> DatasetMetadata:
    return DatasetMetadata(
        id=row.id,
        dataset_version_id=row.dataset_version_id,
        row_count=row.row_count,
        column_count=row.column_count,
        schema_json=dict(row.schema_json or {}),
        profile_json=dict(row.profile_json or {}),
        quality_json=dict(row.quality_json or {}),
        eda_json=dict(getattr(row, "eda_json", None) or {}),
        semantic_summary=row.semantic_summary,
        target_candidates=list(row.target_candidates or []),
        profiled_at=row.profiled_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class DatasetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_project(
        self, project_id: UUID, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Dataset], int]:
        filters = [
            DatasetRow.project_id == project_id,
            DatasetRow.user_id == user_id,
            DatasetRow.deleted_at.is_(None),
        ]
        total = await self._session.scalar(
            select(func.count()).select_from(DatasetRow).where(*filters)
        )
        result = await self._session.execute(
            select(DatasetRow)
            .where(*filters)
            .order_by(DatasetRow.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [_dataset(r) for r in result.scalars().all()], int(total or 0)

    async def get(self, dataset_id: UUID, user_id: UUID) -> Dataset | None:
        result = await self._session.execute(
            select(DatasetRow).where(
                DatasetRow.id == dataset_id,
                DatasetRow.user_id == user_id,
                DatasetRow.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        return _dataset(row) if row else None

    async def create(
        self,
        *,
        project_id: UUID,
        user_id: UUID,
        name: str,
        storage_path: str,
        format: str,
        mime_type: str | None,
        original_filename: str | None,
        size_bytes: int,
        content_hash: str | None,
        status: str = "uploading",
    ) -> Dataset:
        row = DatasetRow(
            id=uuid4(),
            project_id=project_id,
            user_id=user_id,
            name=name,
            storage_path=storage_path,
            format=format,
            mime_type=mime_type,
            original_filename=original_filename,
            size_bytes=size_bytes,
            status=status,
            content_hash=content_hash,
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _dataset(row)

    async def update_status(
        self,
        dataset_id: UUID,
        *,
        status: str,
        storage_path: str | None = None,
    ) -> Dataset | None:
        row = await self._session.get(DatasetRow, dataset_id)
        if row is None:
            return None
        row.status = status
        if storage_path is not None:
            row.storage_path = storage_path
        await self._session.flush()
        await self._session.refresh(row)
        return _dataset(row)

    async def soft_delete(self, dataset_id: UUID, user_id: UUID) -> Dataset | None:
        result = await self._session.execute(
            select(DatasetRow).where(
                DatasetRow.id == dataset_id,
                DatasetRow.user_id == user_id,
                DatasetRow.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        row.deleted_at = datetime.now(timezone.utc)
        row.status = "deleted"
        await self._session.flush()
        await self._session.refresh(row)
        return _dataset(row)

    async def next_version_number(self, workspace_id: UUID, dataset_id: UUID) -> int:
        current = await self._session.scalar(
            select(func.max(DatasetVersionRow.version_number)).where(
                DatasetVersionRow.workspace_id == workspace_id,
                DatasetVersionRow.dataset_id == dataset_id,
            )
        )
        return int(current or 0) + 1

    async def create_version(
        self,
        *,
        workspace_id: UUID,
        dataset_id: UUID,
        project_id: UUID,
        user_id: UUID,
        version_number: int,
        storage_path: str,
        content_hash: str | None,
        label: str | None = None,
        status: str = "profiling",
    ) -> DatasetVersion:
        row = DatasetVersionRow(
            id=uuid4(),
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            project_id=project_id,
            user_id=user_id,
            version_number=version_number,
            label=label,
            storage_path=storage_path,
            content_hash=content_hash,
            status=status,
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _version(row)

    async def list_versions_for_workspace(
        self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[DatasetVersion], int]:
        filters = [
            DatasetVersionRow.workspace_id == workspace_id,
            DatasetVersionRow.user_id == user_id,
        ]
        total = await self._session.scalar(
            select(func.count()).select_from(DatasetVersionRow).where(*filters)
        )
        result = await self._session.execute(
            select(DatasetVersionRow)
            .where(*filters)
            .order_by(DatasetVersionRow.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [_version(r) for r in result.scalars().all()], int(total or 0)

    async def get_version(self, version_id: UUID, user_id: UUID) -> DatasetVersion | None:
        result = await self._session.execute(
            select(DatasetVersionRow).where(
                DatasetVersionRow.id == version_id,
                DatasetVersionRow.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        return _version(row) if row else None

    async def get_version_by_id(self, version_id: UUID) -> DatasetVersion | None:
        row = await self._session.get(DatasetVersionRow, version_id)
        return _version(row) if row else None

    async def update_version_status(self, version_id: UUID, status: str) -> DatasetVersion | None:
        row = await self._session.get(DatasetVersionRow, version_id)
        if row is None:
            return None
        row.status = status
        await self._session.flush()
        await self._session.refresh(row)
        return _version(row)

    async def upsert_metadata(
        self,
        *,
        dataset_version_id: UUID,
        row_count: int,
        column_count: int,
        schema_json: dict[str, Any],
        profile_json: dict[str, Any],
        quality_json: dict[str, Any],
        eda_json: dict[str, Any] | None = None,
        semantic_summary: str | None,
        target_candidates: list[Any] | None = None,
    ) -> DatasetMetadata:
        result = await self._session.execute(
            select(DatasetMetadataRow).where(
                DatasetMetadataRow.dataset_version_id == dataset_version_id
            )
        )
        row = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if row is None:
            row = DatasetMetadataRow(
                id=uuid4(),
                dataset_version_id=dataset_version_id,
                row_count=row_count,
                column_count=column_count,
                schema_json=schema_json,
                profile_json=profile_json,
                quality_json=quality_json,
                eda_json=eda_json or {},
                semantic_summary=semantic_summary,
                target_candidates=target_candidates or [],
                profiled_at=now,
            )
            self._session.add(row)
        else:
            row.row_count = row_count
            row.column_count = column_count
            row.schema_json = schema_json
            row.profile_json = profile_json
            row.quality_json = quality_json
            if eda_json is not None:
                row.eda_json = eda_json
            row.semantic_summary = semantic_summary
            row.target_candidates = target_candidates or []
            row.profiled_at = now
        await self._session.flush()
        await self._session.refresh(row)
        return _metadata(row)

    async def get_metadata(
        self, dataset_version_id: UUID, user_id: UUID
    ) -> DatasetMetadata | None:
        version = await self.get_version(dataset_version_id, user_id)
        if version is None:
            return None
        result = await self._session.execute(
            select(DatasetMetadataRow).where(
                DatasetMetadataRow.dataset_version_id == dataset_version_id
            )
        )
        row = result.scalar_one_or_none()
        return _metadata(row) if row else None

    async def update_eda_json(
        self, dataset_version_id: UUID, eda_json: dict[str, Any]
    ) -> DatasetMetadata | None:
        result = await self._session.execute(
            select(DatasetMetadataRow).where(
                DatasetMetadataRow.dataset_version_id == dataset_version_id
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        row.eda_json = eda_json
        await self._session.flush()
        await self._session.refresh(row)
        return _metadata(row)
