from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Job
from app.repositories.models import JobRow


def _to_entity(row: JobRow) -> Job:
    return Job(
        id=row.id,
        user_id=row.user_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        job_type=row.job_type,
        status=str(row.status),
        progress_pct=row.progress_pct,
        input_json=dict(row.input_json or {}),
        result_json=dict(row.result_json or {}),
        error_message=row.error_message,
        celery_task_id=row.celery_task_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class JobRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        user_id: UUID,
        project_id: UUID,
        workspace_id: UUID | None,
        job_type: str,
        input_json: dict[str, Any] | None = None,
    ) -> Job:
        row = JobRow(
            id=uuid4(),
            user_id=user_id,
            project_id=project_id,
            workspace_id=workspace_id,
            job_type=job_type,
            status="queued",
            progress_pct=0,
            input_json=input_json or {},
            result_json={},
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _to_entity(row)

    async def get(self, job_id: UUID, user_id: UUID) -> Job | None:
        result = await self._session.execute(
            select(JobRow).where(JobRow.id == job_id, JobRow.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        return _to_entity(row) if row else None

    async def get_by_id(self, job_id: UUID) -> Job | None:
        row = await self._session.get(JobRow, job_id)
        return _to_entity(row) if row else None

    async def set_celery_task_id(self, job_id: UUID, celery_task_id: str) -> None:
        row = await self._session.get(JobRow, job_id)
        if row:
            row.celery_task_id = celery_task_id
            await self._session.flush()

    async def update_status(
        self,
        job_id: UUID,
        *,
        status: str | None = None,
        progress_pct: int | None = None,
        result_json: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> Job | None:
        row = await self._session.get(JobRow, job_id)
        if row is None:
            return None
        if status is not None:
            row.status = status
        if progress_pct is not None:
            row.progress_pct = progress_pct
        if result_json is not None:
            row.result_json = result_json
        if error_message is not None:
            row.error_message = error_message
        await self._session.flush()
        await self._session.refresh(row)
        return _to_entity(row)
