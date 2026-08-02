from __future__ import annotations

from uuid import UUID

from app.domain.entities import User
from app.domain.errors import NotFoundError
from app.repositories.user_repo import UserRepository


class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def ensure_user(
        self,
        *,
        user_id: UUID,
        email: str,
        display_name: str | None,
        avatar_url: str | None,
    ) -> User:
        existing = await self._repo.get_by_id(user_id)
        if existing is None:
            return await self._repo.upsert(
                user_id=user_id,
                email=email,
                display_name=display_name or email.split("@")[0],
                avatar_url=avatar_url,
            )

        # Backfill Google/OAuth profile fields when the row exists but is incomplete.
        needs_name = not (existing.display_name or "").strip() and bool(display_name)
        needs_avatar = not (existing.avatar_url or "").strip() and bool(avatar_url)
        email_changed = bool(email) and email != existing.email
        if needs_name or needs_avatar or email_changed:
            return await self._repo.upsert(
                user_id=user_id,
                email=email or existing.email,
                display_name=display_name if needs_name else existing.display_name,
                avatar_url=avatar_url if needs_avatar else existing.avatar_url,
            )
        return existing

    async def get_me(self, user_id: UUID) -> User:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User profile not found")
        return user

    async def update_me(
        self,
        user_id: UUID,
        *,
        display_name: str | None = None,
        avatar_url: str | None = None,
        preferences: dict | None = None,
        fields: set[str] | None = None,
    ) -> User:
        user = await self._repo.update_profile(
            user_id,
            display_name=display_name,
            avatar_url=avatar_url,
            preferences=preferences,
            fields=fields,
        )
        if user is None:
            raise NotFoundError("User profile not found")
        return user
