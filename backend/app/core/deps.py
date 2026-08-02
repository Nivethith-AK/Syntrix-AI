"""FastAPI dependencies.

AuthZ v1 (locked): owner-only. JWT subject becomes user_id; services filter by that owner.
Org/team membership is intentionally not implemented.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import AuthUser, decode_supabase_jwt
from app.repositories.user_repo import UserRepository
from app.services.user_service import UserService


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(get_db_session),
) -> AuthUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    auth_user = decode_supabase_jwt(token)

    # Ensure public.users row exists (trigger may lag or email/password path)
    user_service = UserService(UserRepository(session))
    await user_service.ensure_user(
        user_id=auth_user.id,
        email=auth_user.email or f"{auth_user.id}@users.local",
        display_name=None,
        avatar_url=None,
    )
    return auth_user


async def get_current_user_id(
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> UUID:
    return user.id


DbSession = Annotated[AsyncSession, Depends(get_db_session)]
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
