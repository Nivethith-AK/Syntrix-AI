"""Workspace-scoped agent workflows (LangGraph)."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import NotFoundError, ValidationDomainError
from app.repositories.job_repo import JobRepository
from app.repositories.models import AgentActivityRow, AgentRunRow
from app.repositories.workspace_repo import WorkspaceRepository


class WorkflowService:
    def __init__(
        self,
        session: AsyncSession,
        workspace_repo: WorkspaceRepository,
        job_repo: JobRepository,
    ) -> None:
        self._session = session
        self._workspaces = workspace_repo
        self._jobs = job_repo

    async def start(
        self,
        workspace_id: UUID,
        user_id: UUID,
        *,
        workflow_type: str,
        dataset_version_id: UUID | None = None,
        input_data: dict[str, Any] | None = None,
    ) -> tuple[AgentRunRow, Any]:
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        wf = workflow_type.lower()
        if wf not in {"eda", "automl", "explain", "report", "chat", "custom"}:
            raise ValidationDomainError(f"Unsupported workflow_type: {workflow_type}")

        run = AgentRunRow(
            id=uuid4(),
            workspace_id=workspace_id,
            project_id=ws.project_id,
            user_id=user_id,
            workflow_type=wf,
            status="queued",
            input_json={
                "dataset_version_id": str(dataset_version_id) if dataset_version_id else None,
                **(input_data or {}),
            },
            checkpoint_thread_id=str(uuid4()),
        )
        self._session.add(run)
        await self._session.flush()

        job = await self._jobs.create(
            user_id=user_id,
            project_id=ws.project_id,
            workspace_id=workspace_id,
            job_type=f"workflow_{wf}",
            input_json={"agent_run_id": str(run.id), "workflow_type": wf, **run.input_json},
        )
        run.job_id = job.id
        await self._session.commit()

        from app.workers.tasks import run_workflow_task

        async_result = run_workflow_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        await self._session.commit()
        job = await self._jobs.get(job.id, user_id)
        await self._session.refresh(run)
        return run, job

    async def get_run(self, run_id: UUID, user_id: UUID) -> AgentRunRow:
        run = await self._session.get(AgentRunRow, run_id)
        if run is None or run.user_id != user_id:
            raise NotFoundError("Workflow run not found")
        return run

    async def resume(self, run_id: UUID, user_id: UUID, human_response: dict[str, Any]) -> AgentRunRow:
        run = await self.get_run(run_id, user_id)
        if run.status not in {"waiting_human", "queued", "running"}:
            raise ValidationDomainError("Run is not waiting for human input")
        job = await self._jobs.create(
            user_id=user_id,
            project_id=run.project_id,
            workspace_id=run.workspace_id,
            job_type=f"workflow_{run.workflow_type}_resume",
            input_json={
                "agent_run_id": str(run.id),
                "workflow_type": run.workflow_type,
                "human_response": human_response,
                **(run.input_json or {}),
            },
        )
        run.status = "queued"
        run.job_id = job.id
        await self._session.commit()
        from app.workers.tasks import run_workflow_task

        async_result = run_workflow_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        await self._session.commit()
        await self._session.refresh(run)
        return run

    async def list_runs(self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int):
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        total = await self._session.scalar(
            select(func.count()).select_from(AgentRunRow).where(
                AgentRunRow.workspace_id == workspace_id, AgentRunRow.user_id == user_id
            )
        )
        rows = (
            await self._session.execute(
                select(AgentRunRow)
                .where(AgentRunRow.workspace_id == workspace_id, AgentRunRow.user_id == user_id)
                .order_by(AgentRunRow.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        return rows, int(total or 0)

    async def list_activities(self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int):
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        total = await self._session.scalar(
            select(func.count()).select_from(AgentActivityRow).where(
                AgentActivityRow.workspace_id == workspace_id,
                AgentActivityRow.user_id == user_id,
            )
        )
        rows = (
            await self._session.execute(
                select(AgentActivityRow)
                .where(
                    AgentActivityRow.workspace_id == workspace_id,
                    AgentActivityRow.user_id == user_id,
                )
                .order_by(AgentActivityRow.started_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        return rows, int(total or 0)
