from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.v1.schemas import WorkspaceOut, WorkspaceUpdate
from app.core.deps import CurrentUser, DbSession
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: UUID, user: CurrentUser, session: DbSession
) -> WorkspaceOut:
    service = WorkspaceService(WorkspaceRepository(session), ProjectRepository(session))
    workspace = await service.get_workspace(workspace_id, user.id)
    return WorkspaceOut.model_validate(workspace)


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: UUID,
    body: WorkspaceUpdate,
    user: CurrentUser,
    session: DbSession,
) -> WorkspaceOut:
    service = WorkspaceService(WorkspaceRepository(session), ProjectRepository(session))
    workspace = await service.update_workspace(
        workspace_id,
        user.id,
        name=body.name,
        description=body.description,
        status=body.status,
        settings=body.settings,
    )
    return WorkspaceOut.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID, user: CurrentUser, session: DbSession
) -> Response:
    service = WorkspaceService(WorkspaceRepository(session), ProjectRepository(session))
    await service.delete_workspace(workspace_id, user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
