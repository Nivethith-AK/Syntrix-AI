from __future__ import annotations

from uuid import UUID

from app.domain.entities import Workspace
from app.domain.errors import NotFoundError
from app.repositories.project_repo import ProjectRepository
from app.repositories.workspace_repo import WorkspaceRepository


class WorkspaceService:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        project_repo: ProjectRepository,
    ) -> None:
        self._workspaces = workspace_repo
        self._projects = project_repo

    async def list_workspaces(
        self, project_id: UUID, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Workspace], int]:
        project = await self._projects.get(project_id, user_id)
        if project is None:
            raise NotFoundError("Project not found")
        return await self._workspaces.list_for_project(
            project_id, user_id, limit=limit, offset=offset
        )

    async def create_workspace(
        self,
        project_id: UUID,
        user_id: UUID,
        *,
        name: str,
        description: str | None = None,
        settings: dict | None = None,
    ) -> Workspace:
        project = await self._projects.get(project_id, user_id)
        if project is None:
            raise NotFoundError("Project not found")
        return await self._workspaces.create(
            project_id=project_id,
            user_id=user_id,
            name=name.strip(),
            description=description,
            settings=settings,
        )

    async def get_workspace(self, workspace_id: UUID, user_id: UUID) -> Workspace:
        workspace = await self._workspaces.get(workspace_id, user_id)
        if workspace is None:
            raise NotFoundError("Workspace not found")
        return workspace

    async def update_workspace(
        self,
        workspace_id: UUID,
        user_id: UUID,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
        settings: dict | None = None,
    ) -> Workspace:
        workspace = await self._workspaces.update(
            workspace_id,
            user_id,
            name=name.strip() if name else None,
            description=description,
            status=status,
            settings=settings,
        )
        if workspace is None:
            raise NotFoundError("Workspace not found")
        return workspace

    async def delete_workspace(self, workspace_id: UUID, user_id: UUID) -> None:
        deleted = await self._workspaces.soft_delete(workspace_id, user_id)
        if not deleted:
            raise NotFoundError("Workspace not found")
