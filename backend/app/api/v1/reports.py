"""Report APIs."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.v1.pagination import pagination_params
from app.api.v1.schemas import Paginated
from app.core.deps import CurrentUser, DbSession
from app.repositories.job_repo import JobRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.report_service import ReportService

router = APIRouter(tags=["reports"])


class ReportCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    report_type: str = "executive"
    experiment_id: UUID | None = None
    model_id: UUID | None = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    project_id: UUID
    title: str
    report_type: str
    status: str
    content_md: str | None = None
    storage_path_md: str | None = None
    storage_path_pdf: str | None = None
    created_at: Any = None
    updated_at: Any = None


class ReportAccepted(BaseModel):
    report: ReportOut
    job_id: UUID


def _svc(session: DbSession) -> ReportService:
    return ReportService(session, WorkspaceRepository(session), JobRepository(session))


@router.get("/workspaces/{workspace_id}/reports", response_model=Paginated[ReportOut])
async def list_reports(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[ReportOut]:
    limit, offset = paging
    items, total = await _svc(session).list_reports(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[ReportOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post(
    "/workspaces/{workspace_id}/reports",
    response_model=ReportAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_report(
    workspace_id: UUID, body: ReportCreate, user: CurrentUser, session: DbSession
) -> ReportAccepted:
    report, job = await _svc(session).create(
        workspace_id,
        user.id,
        title=body.title,
        report_type=body.report_type,
        experiment_id=body.experiment_id,
        model_id=body.model_id,
    )
    return ReportAccepted(report=ReportOut.model_validate(report), job_id=job.id)


@router.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(report_id: UUID, user: CurrentUser, session: DbSession) -> ReportOut:
    return ReportOut.model_validate(await _svc(session).get(report_id, user.id))


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: UUID,
    user: CurrentUser,
    session: DbSession,
    format: str = Query(default="md", pattern="^(md|pdf)$"),
) -> dict:
    url = await _svc(session).download_url(report_id, user.id, format)
    return {"url": url}
