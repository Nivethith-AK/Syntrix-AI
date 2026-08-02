from __future__ import annotations

import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, status
from fastapi.responses import StreamingResponse

from app.api.v1.schemas import DemoJobCreate, JobAccepted, JobOut
from app.core.deps import CurrentUser, DbSession
from app.repositories.job_repo import JobRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.job_service import JobService

router = APIRouter(tags=["jobs"])


def _job_service(session: DbSession) -> JobService:
    return JobService(
        JobRepository(session),
        ProjectRepository(session),
        WorkspaceRepository(session),
        session=session,
    )


@router.post(
    "/jobs/demo",
    response_model=JobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_demo_job(
    body: DemoJobCreate, user: CurrentUser, session: DbSession
) -> JobAccepted:
    service = _job_service(session)
    job = await service.submit_demo_job(
        user.id,
        project_id=body.project_id,
        workspace_id=body.workspace_id,
        message=body.message,
    )
    return JobAccepted(
        job_id=job.id,
        status=job.status,
        events_url=f"/api/v1/jobs/{job.id}/events",
    )


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: UUID, user: CurrentUser, session: DbSession) -> JobOut:
    service = _job_service(session)
    job = await service.get_job(job_id, user.id)
    return JobOut.model_validate(job)


@router.post("/jobs/{job_id}/cancel", response_model=JobOut)
async def cancel_job(job_id: UUID, user: CurrentUser, session: DbSession) -> JobOut:
    service = _job_service(session)
    job = await service.cancel_job(job_id, user.id)
    return JobOut.model_validate(job)


@router.get("/jobs/{job_id}/events")
async def job_events(
    job_id: UUID, user: CurrentUser, session: DbSession
) -> StreamingResponse:
    """Simple SSE poll loop over Postgres job status (Phase 1)."""

    from app.core.database import AsyncSessionLocal

    # Ownership check up front (request-scoped session)
    await _job_service(session).get_job(job_id, user.id)
    user_id = user.id

    async def event_stream():
        terminal = {"succeeded", "failed", "cancelled"}
        for _ in range(60):
            async with AsyncSessionLocal() as stream_session:
                service = _job_service(stream_session)
                job = await service.get_job(job_id, user_id)
                payload = {
                    "event": "progress" if job.status == "running" else job.status,
                    "job_id": str(job.id),
                    "ts": job.updated_at.isoformat() if job.updated_at else None,
                    "data": {
                        "status": job.status,
                        "progress_pct": job.progress_pct,
                        "result_json": job.result_json,
                        "error_message": job.error_message,
                    },
                }
                yield f"event: {payload['event']}\ndata: {json.dumps(payload)}\n\n"
                if job.status in terminal:
                    yield f"event: completed\ndata: {json.dumps(payload)}\n\n"
                    return
            await asyncio.sleep(1)
        yield "event: heartbeat\ndata: {}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
