"""Agent workflow + activity APIs."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.v1.pagination import pagination_params
from app.api.v1.schemas import Paginated
from app.core.deps import CurrentUser, DbSession
from app.repositories.job_repo import JobRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.workflow_service import WorkflowService

router = APIRouter(tags=["workflows"])


class WorkflowStart(BaseModel):
    workflow_type: str
    dataset_version_id: UUID | None = None
    input: dict[str, Any] = Field(default_factory=dict)


class WorkflowAccepted(BaseModel):
    run_id: UUID
    job_id: UUID
    workspace_id: UUID
    status: str
    events_url: str


class AgentRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    project_id: UUID
    user_id: UUID
    job_id: UUID | None = None
    workflow_type: str
    status: str
    input_json: dict[str, Any] = Field(default_factory=dict)
    result_json: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None
    created_at: Any = None
    updated_at: Any = None


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_run_id: UUID | None = None
    workspace_id: UUID
    agent_name: str
    activity_type: str
    status: str
    payload_json: dict[str, Any] = Field(default_factory=dict)
    started_at: Any = None
    completed_at: Any = None


class ResumeBody(BaseModel):
    target_column: str | None = None
    task_type: str | None = None
    input: dict[str, Any] = Field(default_factory=dict)


def _svc(session: DbSession) -> WorkflowService:
    return WorkflowService(session, WorkspaceRepository(session), JobRepository(session))


@router.post(
    "/workspaces/{workspace_id}/workflows",
    response_model=WorkflowAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_workflow(
    workspace_id: UUID, body: WorkflowStart, user: CurrentUser, session: DbSession
) -> WorkflowAccepted:
    run, job = await _svc(session).start(
        workspace_id,
        user.id,
        workflow_type=body.workflow_type,
        dataset_version_id=body.dataset_version_id,
        input_data=body.input,
    )
    return WorkflowAccepted(
        run_id=run.id,
        job_id=job.id,
        workspace_id=workspace_id,
        status=job.status,
        events_url=f"/api/v1/jobs/{job.id}/events",
    )


@router.get("/workflows/{run_id}", response_model=AgentRunOut)
async def get_workflow(run_id: UUID, user: CurrentUser, session: DbSession) -> AgentRunOut:
    run = await _svc(session).get_run(run_id, user.id)
    return AgentRunOut.model_validate(run)


@router.post("/workflows/{run_id}/resume", response_model=AgentRunOut)
async def resume_workflow(
    run_id: UUID, body: ResumeBody, user: CurrentUser, session: DbSession
) -> AgentRunOut:
    human = dict(body.input)
    if body.target_column:
        human["target_column"] = body.target_column
    if body.task_type:
        human["task_type"] = body.task_type
    run = await _svc(session).resume(run_id, user.id, human)
    return AgentRunOut.model_validate(run)


@router.get("/workspaces/{workspace_id}/agent-runs", response_model=Paginated[AgentRunOut])
async def list_runs(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[AgentRunOut]:
    limit, offset = paging
    items, total = await _svc(session).list_runs(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[AgentRunOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get(
    "/workspaces/{workspace_id}/agent-activities",
    response_model=Paginated[ActivityOut],
)
async def list_activities(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[ActivityOut]:
    limit, offset = paging
    items, total = await _svc(session).list_activities(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[ActivityOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )
