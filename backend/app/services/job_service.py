from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Job
from app.domain.errors import NotFoundError, ValidationDomainError
from app.repositories.job_repo import JobRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository


class JobService:
    def __init__(
        self,
        job_repo: JobRepository,
        project_repo: ProjectRepository,
        workspace_repo: WorkspaceRepository,
        session: AsyncSession | None = None,
    ) -> None:
        self._jobs = job_repo
        self._projects = project_repo
        self._workspaces = workspace_repo
        self._session = session

    async def get_job(self, job_id: UUID, user_id: UUID) -> Job:
        job = await self._jobs.get(job_id, user_id)
        if job is None:
            raise NotFoundError("Job not found")
        return job

    async def submit_demo_job(
        self,
        user_id: UUID,
        *,
        project_id: UUID,
        workspace_id: UUID | None = None,
        message: str = "hello from Syntrix",
    ) -> Job:
        project = await self._projects.get(project_id, user_id)
        if project is None:
            raise NotFoundError("Project not found")

        if workspace_id is not None:
            workspace = await self._workspaces.get(workspace_id, user_id)
            if workspace is None or workspace.project_id != project_id:
                raise NotFoundError("Workspace not found")

        job = await self._jobs.create(
            user_id=user_id,
            project_id=project_id,
            workspace_id=workspace_id,
            job_type="demo_hello",
            input_json={"message": message},
        )
        # Commit before enqueue so the worker can read the durable job row.
        if self._session is not None:
            await self._session.commit()

        # Import late to avoid circular import at module load
        from app.workers.tasks import demo_hello_task

        async_result = demo_hello_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        if self._session is not None:
            await self._session.commit()
        refreshed = await self._jobs.get(job.id, user_id)
        if refreshed is None:
            raise ValidationDomainError("Failed to enqueue job")
        return refreshed

    async def cancel_job(self, job_id: UUID, user_id: UUID) -> Job:
        job = await self.get_job(job_id, user_id)
        if job.status in {"succeeded", "failed", "cancelled"}:
            return job
        updated = await self._jobs.update_status(job_id, status="cancelled", progress_pct=job.progress_pct)
        if updated is None:
            raise NotFoundError("Job not found")
        return updated

    async def apply_worker_update(
        self,
        job_id: UUID,
        *,
        status: str | None = None,
        progress_pct: int | None = None,
        result_json: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> Job | None:
        return await self._jobs.update_status(
            job_id,
            status=status,
            progress_pct=progress_pct,
            result_json=result_json,
            error_message=error_message,
        )
