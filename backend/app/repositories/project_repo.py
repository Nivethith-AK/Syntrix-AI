from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Project
from app.repositories.models import ProjectRow


def _to_entity(row: ProjectRow) -> Project:
    return Project(
        id=row.id,
        user_id=row.user_id,
        name=row.name,
        description=row.description,
        status=str(row.status),
        settings=dict(row.settings or {}),
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
    )


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(
        self, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Project], int]:
        filters = [
            ProjectRow.user_id == user_id,
            ProjectRow.deleted_at.is_(None),
        ]
        total = await self._session.scalar(
            select(func.count()).select_from(ProjectRow).where(*filters)
        )
        result = await self._session.execute(
            select(ProjectRow)
            .where(*filters)
            .order_by(ProjectRow.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = [_to_entity(r) for r in result.scalars().all()]
        return items, int(total or 0)

    async def get(self, project_id: UUID, user_id: UUID) -> Project | None:
        result = await self._session.execute(
            select(ProjectRow).where(
                ProjectRow.id == project_id,
                ProjectRow.user_id == user_id,
                ProjectRow.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        return _to_entity(row) if row else None

    async def create(
        self,
        *,
        user_id: UUID,
        name: str,
        description: str | None,
        settings: dict | None = None,
    ) -> Project:
        row = ProjectRow(
            id=uuid4(),
            user_id=user_id,
            name=name,
            description=description,
            status="active",
            settings=settings or {},
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _to_entity(row)

    async def update(
        self,
        project_id: UUID,
        user_id: UUID,
        *,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
        settings: dict | None = None,
    ) -> Project | None:
        result = await self._session.execute(
            select(ProjectRow).where(
                ProjectRow.id == project_id,
                ProjectRow.user_id == user_id,
                ProjectRow.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        if name is not None:
            row.name = name
        if description is not None:
            row.description = description
        if status is not None:
            row.status = status
        if settings is not None:
            row.settings = settings
        await self._session.flush()
        await self._session.refresh(row)
        return _to_entity(row)

    async def soft_delete(self, project_id: UUID, user_id: UUID) -> bool:
        result = await self._session.execute(
            select(ProjectRow).where(
                ProjectRow.id == project_id,
                ProjectRow.user_id == user_id,
                ProjectRow.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return False
        row.deleted_at = datetime.now(timezone.utc)
        row.status = "archived"
        await self._session.flush()
        return True
