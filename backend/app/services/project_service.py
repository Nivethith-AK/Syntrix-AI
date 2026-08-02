from __future__ import annotations

from uuid import UUID

from app.domain.entities import Project
from app.domain.errors import NotFoundError
from app.repositories.project_repo import ProjectRepository


class ProjectService:
    def __init__(self, repo: ProjectRepository) -> None:
        self._repo = repo

    async def list_projects(
        self, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Project], int]:
        return await self._repo.list_for_user(user_id, limit=limit, offset=offset)

    async def get_project(self, project_id: UUID, user_id: UUID) -> Project:
        project = await self._repo.get(project_id, user_id)
        if project is None:
            raise NotFoundError("Project not found")
        return project

    async def create_project(
        self,
        user_id: UUID,
        *,
        name: str,
        description: str | None = None,
        settings: dict | None = None,
    ) -> Project:
        return await self._repo.create(
            user_id=user_id,
            name=name.strip(),
            description=description,
            settings=settings,
        )

    async def update_project(
        self,
        project_id: UUID,
        user_id: UUID,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
        settings: dict | None = None,
    ) -> Project:
        project = await self._repo.update(
            project_id,
            user_id,
            name=name.strip() if name else None,
            description=description,
            status=status,
            settings=settings,
        )
        if project is None:
            raise NotFoundError("Project not found")
        return project

    async def delete_project(self, project_id: UUID, user_id: UUID) -> None:
        deleted = await self._repo.soft_delete(project_id, user_id)
        if not deleted:
            raise NotFoundError("Project not found")
