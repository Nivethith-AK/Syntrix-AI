from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import User
from app.repositories.models import UserRow


def _to_entity(row: UserRow) -> User:
    return User(
        id=row.id,
        email=row.email,
        display_name=row.display_name,
        avatar_url=row.avatar_url,
        preferences=dict(row.preferences or {}),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        row = await self._session.get(UserRow, user_id)
        return _to_entity(row) if row else None

    async def upsert(
        self,
        *,
        user_id: UUID,
        email: str,
        display_name: str | None,
        avatar_url: str | None,
    ) -> User:
        row = await self._session.get(UserRow, user_id)
        if row is None:
            row = UserRow(
                id=user_id,
                email=email,
                display_name=display_name,
                avatar_url=avatar_url,
                preferences={},
            )
            self._session.add(row)
        else:
            row.email = email
            if display_name is not None:
                row.display_name = display_name
            if avatar_url is not None:
                row.avatar_url = avatar_url
        await self._session.flush()
        await self._session.refresh(row)
        return _to_entity(row)

    async def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None = None,
        preferences: dict | None = None,
    ) -> User | None:
        row = await self._session.get(UserRow, user_id)
        if row is None:
            return None
        if display_name is not None:
            row.display_name = display_name
        if preferences is not None:
            row.preferences = preferences
        await self._session.flush()
        await self._session.refresh(row)
        return _to_entity(row)

    async def exists(self, user_id: UUID) -> bool:
        result = await self._session.execute(
            select(UserRow.id).where(UserRow.id == user_id)
        )
        return result.scalar_one_or_none() is not None
