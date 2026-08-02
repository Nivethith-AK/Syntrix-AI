from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.schemas import UserOut, UserUpdate
from app.core.deps import CurrentUser, DbSession
from app.repositories.user_repo import UserRepository
from app.services.user_service import UserService

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserOut)
async def get_me(user: CurrentUser, session: DbSession) -> UserOut:
    service = UserService(UserRepository(session))
    profile = await service.get_me(user.id)
    return UserOut.model_validate(profile)


@router.patch("", response_model=UserOut)
async def patch_me(
    body: UserUpdate, user: CurrentUser, session: DbSession
) -> UserOut:
    service = UserService(UserRepository(session))
    profile = await service.update_me(
        user.id,
        display_name=body.display_name,
        preferences=body.preferences,
    )
    return UserOut.model_validate(profile)
