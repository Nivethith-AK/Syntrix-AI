"""Dataset upload, versions, preview, metadata, and EDA endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status

from app.api.v1.pagination import pagination_params
from app.api.v1.schemas import (
    DatasetMetadataOut,
    DatasetOut,
    DatasetPreviewOut,
    DatasetUploadAccepted,
    DatasetVersionOut,
    EdaAccepted,
    Paginated,
)
from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.domain.errors import PayloadTooLargeError, ValidationDomainError
from app.repositories.dataset_repo import DatasetRepository
from app.repositories.job_repo import JobRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.dataset_service import DatasetService

router = APIRouter(tags=["datasets"])


def _dataset_service(session: DbSession) -> DatasetService:
    return DatasetService(
        DatasetRepository(session),
        WorkspaceRepository(session),
        ProjectRepository(session),
        JobRepository(session),
        session=session,
    )


@router.get("/projects/{project_id}/datasets", response_model=Paginated[DatasetOut])
async def list_project_datasets(
    project_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[DatasetOut]:
    limit, offset = paging
    items, total = await _dataset_service(session).list_project_datasets(
        project_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[DatasetOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post(
    "/workspaces/{workspace_id}/datasets/upload",
    response_model=DatasetUploadAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_dataset(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
) -> DatasetUploadAccepted:
    settings = get_settings()
    filename = file.filename or "dataset.csv"
    # Stream with hard cap (+1 byte) to reject oversized uploads early
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.upload_max_bytes:
            raise PayloadTooLargeError(
                f"File exceeds max upload size of {settings.upload_max_bytes} bytes"
            )
        chunks.append(chunk)
    content = b"".join(chunks)
    if not content:
        raise ValidationDomainError("Uploaded file is empty")

    dataset, version, job = await _dataset_service(session).upload_to_workspace(
        workspace_id,
        user.id,
        filename=filename,
        content=content,
        content_type=file.content_type,
        dataset_name=name,
    )
    return DatasetUploadAccepted(
        dataset=DatasetOut.model_validate(dataset),
        dataset_version=DatasetVersionOut.model_validate(version),
        job_id=job.id,
        status=job.status,
        events_url=f"/api/v1/jobs/{job.id}/events",
    )


@router.get(
    "/workspaces/{workspace_id}/dataset-versions",
    response_model=Paginated[DatasetVersionOut],
)
async def list_workspace_versions(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[DatasetVersionOut]:
    limit, offset = paging
    items, total = await _dataset_service(session).list_workspace_versions(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[DatasetVersionOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get("/dataset-versions/{version_id}", response_model=DatasetVersionOut)
async def get_dataset_version(
    version_id: UUID, user: CurrentUser, session: DbSession
) -> DatasetVersionOut:
    version = await _dataset_service(session).get_version(version_id, user.id)
    return DatasetVersionOut.model_validate(version)


@router.get("/dataset-versions/{version_id}/metadata", response_model=DatasetMetadataOut)
async def get_dataset_metadata(
    version_id: UUID, user: CurrentUser, session: DbSession
) -> DatasetMetadataOut:
    meta = await _dataset_service(session).get_metadata(version_id, user.id)
    return DatasetMetadataOut.model_validate(meta)


@router.get("/dataset-versions/{version_id}/preview", response_model=DatasetPreviewOut)
async def preview_dataset_version(
    version_id: UUID,
    user: CurrentUser,
    session: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
) -> DatasetPreviewOut:
    preview = await _dataset_service(session).preview(version_id, user.id, limit=limit)
    return DatasetPreviewOut.model_validate(preview)


@router.get("/dataset-versions/{version_id}/eda")
async def get_eda(
    version_id: UUID, user: CurrentUser, session: DbSession
) -> dict:
    """Return persisted EDA insights (from profiling or a dedicated EDA job)."""
    meta = await _dataset_service(session).get_metadata(version_id, user.id)
    return {
        "dataset_version_id": str(version_id),
        "eda": meta.eda_json or {},
        "profiled_at": meta.profiled_at.isoformat() if meta.profiled_at else None,
        "semantic_summary": meta.semantic_summary,
        "quality": meta.quality_json,
        "target_candidates": meta.target_candidates,
    }


@router.post(
    "/dataset-versions/{version_id}/eda",
    response_model=EdaAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_eda(
    version_id: UUID, user: CurrentUser, session: DbSession
) -> EdaAccepted:
    version, job = await _dataset_service(session).enqueue_eda(version_id, user.id)
    return EdaAccepted(
        dataset_version_id=version.id,
        job_id=job.id,
        status=job.status,
        events_url=f"/api/v1/jobs/{job.id}/events",
    )


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: UUID, user: CurrentUser, session: DbSession
) -> Response:
    await _dataset_service(session).soft_delete_dataset(dataset_id, user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
