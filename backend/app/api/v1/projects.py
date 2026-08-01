from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.api.v1.pagination import pagination_params
from app.api.v1.schemas import (
    Paginated,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    WorkspaceCreate,
    WorkspaceOut,
)
from app.core.deps import CurrentUser, DbSession
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.project_service import ProjectService
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=Paginated[ProjectOut])
async def list_projects(
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[ProjectOut]:
    limit, offset = paging
    service = ProjectService(ProjectRepository(session))
    items, total = await service.list_projects(user.id, limit=limit, offset=offset)
    return Paginated(
        items=[ProjectOut.model_validate(p) for p in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate, user: CurrentUser, session: DbSession
) -> ProjectOut:
    service = ProjectService(ProjectRepository(session))
    project = await service.create_project(
        user.id,
        name=body.name,
        description=body.description,
        settings=body.settings,
    )
    return ProjectOut.model_validate(project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID, user: CurrentUser, session: DbSession
) -> ProjectOut:
    service = ProjectService(ProjectRepository(session))
    project = await service.get_project(project_id, user.id)
    return ProjectOut.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID, body: ProjectUpdate, user: CurrentUser, session: DbSession
) -> ProjectOut:
    service = ProjectService(ProjectRepository(session))
    project = await service.update_project(
        project_id,
        user.id,
        name=body.name,
        description=body.description,
        status=body.status,
        settings=body.settings,
    )
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID, user: CurrentUser, session: DbSession
) -> Response:
    service = ProjectService(ProjectRepository(session))
    await service.delete_project(project_id, user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/workspaces", response_model=Paginated[WorkspaceOut])
async def list_workspaces(
    project_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[WorkspaceOut]:
    limit, offset = paging
    service = WorkspaceService(WorkspaceRepository(session), ProjectRepository(session))
    items, total = await service.list_workspaces(
        project_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[WorkspaceOut.model_validate(w) for w in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post(
    "/{project_id}/workspaces",
    response_model=WorkspaceOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace(
    project_id: UUID,
    body: WorkspaceCreate,
    user: CurrentUser,
    session: DbSession,
) -> WorkspaceOut:
    service = WorkspaceService(WorkspaceRepository(session), ProjectRepository(session))
    workspace = await service.create_workspace(
        project_id,
        user.id,
        name=body.name,
        description=body.description,
        settings=body.settings,
    )
    return WorkspaceOut.model_validate(workspace)
