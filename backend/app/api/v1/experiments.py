"""Experiments, models, predictions, explanations."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.api.v1.pagination import pagination_params
from app.api.v1.schemas import JobAccepted, Paginated
from app.core.deps import CurrentUser, DbSession
from app.repositories.dataset_repo import DatasetRepository
from app.repositories.job_repo import JobRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.experiment_service import ExperimentService

router = APIRouter(tags=["experiments"])


class ExperimentCreate(BaseModel):
    dataset_version_id: UUID
    name: str = Field(min_length=1, max_length=200)
    task_type: str = Field(pattern="^(classification|regression|clustering)$")
    target_column: str | None = Field(default=None, max_length=200)
    algorithms: list[str] | None = None

    @model_validator(mode="after")
    def validate_target_for_task(self) -> ExperimentCreate:
        if self.task_type != "clustering" and not (self.target_column or "").strip():
            raise ValueError("target_column is required for classification and regression")
        if self.task_type == "clustering":
            self.target_column = (self.target_column or "").strip() or None
        return self


class ExperimentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    project_id: UUID
    dataset_version_id: UUID
    user_id: UUID
    name: str
    task_type: str
    status: str
    config_json: dict[str, Any] = Field(default_factory=dict)
    metrics_json: dict[str, Any] = Field(default_factory=dict)
    mlflow_run_id: str | None = None
    job_id: UUID | None = None
    created_at: Any = None
    updated_at: Any = None


class ModelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    experiment_id: UUID
    workspace_id: UUID
    project_id: UUID
    name: str
    algorithm: str
    task_type: str
    artifact_path: str | None = None
    metrics_json: dict[str, Any] = Field(default_factory=dict)
    params_json: dict[str, Any] = Field(default_factory=dict)
    is_champion: bool = False
    status: str
    created_at: Any = None
    updated_at: Any = None


class ExperimentAccepted(BaseModel):
    experiment: ExperimentOut
    job_id: UUID
    status: str


class PredictBody(BaseModel):
    rows: list[dict[str, Any]]


def _svc(session: DbSession) -> ExperimentService:
    return ExperimentService(
        session,
        WorkspaceRepository(session),
        DatasetRepository(session),
        JobRepository(session),
    )


@router.get("/workspaces/{workspace_id}/experiments", response_model=Paginated[ExperimentOut])
async def list_experiments(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[ExperimentOut]:
    limit, offset = paging
    items, total = await _svc(session).list_experiments(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[ExperimentOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post(
    "/workspaces/{workspace_id}/experiments",
    response_model=ExperimentAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_experiment(
    workspace_id: UUID, body: ExperimentCreate, user: CurrentUser, session: DbSession
) -> ExperimentAccepted:
    exp, job = await _svc(session).create_and_enqueue(
        workspace_id,
        user.id,
        dataset_version_id=body.dataset_version_id,
        name=body.name,
        task_type=body.task_type,
        target_column=body.target_column,
        algorithms=body.algorithms,
    )
    return ExperimentAccepted(
        experiment=ExperimentOut.model_validate(exp),
        job_id=job.id,
        status=job.status,
    )


@router.get("/experiments/{experiment_id}", response_model=ExperimentOut)
async def get_experiment(
    experiment_id: UUID, user: CurrentUser, session: DbSession
) -> ExperimentOut:
    exp = await _svc(session).get_experiment(experiment_id, user.id)
    return ExperimentOut.model_validate(exp)


@router.get("/workspaces/{workspace_id}/models", response_model=Paginated[ModelOut])
async def list_models(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[ModelOut]:
    limit, offset = paging
    items, total = await _svc(session).list_models(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[ModelOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post("/models/{model_id}/champion", response_model=ModelOut)
async def set_champion(model_id: UUID, user: CurrentUser, session: DbSession) -> ModelOut:
    model = await _svc(session).set_champion(model_id, user.id)
    return ModelOut.model_validate(model)


@router.post("/models/{model_id}/predictions")
async def predict(
    model_id: UUID, body: PredictBody, user: CurrentUser, session: DbSession
) -> dict:
    pred = await _svc(session).predict(model_id, user.id, body.rows)
    return {
        "prediction_id": str(pred.id),
        "output_json": pred.output_json,
        "status": pred.status,
    }


@router.post("/models/{model_id}/explain", response_model=JobAccepted, status_code=202)
async def explain(model_id: UUID, user: CurrentUser, session: DbSession) -> JobAccepted:
    job = await _svc(session).enqueue_explain(model_id, user.id)
    return JobAccepted(
        job_id=job.id,
        status=job.status,
        events_url=f"/api/v1/jobs/{job.id}/events",
    )


@router.get("/models/{model_id}/explanations")
async def explanations(model_id: UUID, user: CurrentUser, session: DbSession) -> dict:
    data = await _svc(session).get_explanations(model_id, user.id)
    return {"explanations": data}
