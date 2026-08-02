from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.v1.schemas import UserOut, UserStatsOut, UserUpdate
from app.core.deps import CurrentUser, DbSession
from app.repositories.models import (
    AgentRunRow,
    DatasetRow,
    DatasetVersionRow,
    ExperimentRow,
    ModelRow,
    ProjectRow,
    ReportRow,
    WorkspaceRow,
)
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
    fields = set(body.model_fields_set)
    profile = await service.update_me(
        user.id,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
        preferences=body.preferences,
        fields=fields,
    )
    return UserOut.model_validate(profile)


@router.get("/stats", response_model=UserStatsOut)
async def me_stats(user: CurrentUser, session: DbSession) -> UserStatsOut:
    uid = user.id

    async def _count(stmt) -> int:
        result = await session.execute(stmt)
        return int(result.scalar_one() or 0)

    projects = await _count(
        select(func.count()).select_from(ProjectRow).where(
            ProjectRow.user_id == uid, ProjectRow.deleted_at.is_(None)
        )
    )
    workspaces = await _count(
        select(func.count()).select_from(WorkspaceRow).where(WorkspaceRow.user_id == uid)
    )
    datasets = await _count(
        select(func.count()).select_from(DatasetRow).where(
            DatasetRow.user_id == uid, DatasetRow.deleted_at.is_(None)
        )
    )
    dataset_versions = await _count(
        select(func.count()).select_from(DatasetVersionRow).where(DatasetVersionRow.user_id == uid)
    )
    experiments = await _count(
        select(func.count()).select_from(ExperimentRow).where(ExperimentRow.user_id == uid)
    )
    models = await _count(
        select(func.count())
        .select_from(ModelRow)
        .where(
            ModelRow.workspace_id.in_(select(WorkspaceRow.id).where(WorkspaceRow.user_id == uid))
        )
    )
    agent_runs = await _count(
        select(func.count()).select_from(AgentRunRow).where(AgentRunRow.user_id == uid)
    )
    reports = await _count(
        select(func.count()).select_from(ReportRow).where(ReportRow.user_id == uid)
    )

    return UserStatsOut(
        projects=projects,
        workspaces=workspaces,
        datasets=datasets,
        dataset_versions=dataset_versions,
        experiments=experiments,
        models=models,
        agent_runs=agent_runs,
        reports=reports,
    )
