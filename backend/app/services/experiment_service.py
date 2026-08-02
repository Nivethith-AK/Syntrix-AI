"""Experiment training, model registry, predictions, explanations."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.storage import SupabaseStorage, storage_paths
from app.domain.errors import NotFoundError, ValidationDomainError
from app.repositories.dataset_repo import DatasetRepository
from app.repositories.job_repo import JobRepository
from app.repositories.models import ExperimentRow, ModelRow, PredictionRow
from app.repositories.workspace_repo import WorkspaceRepository


class ExperimentService:
    def __init__(
        self,
        session: AsyncSession,
        workspace_repo: WorkspaceRepository,
        dataset_repo: DatasetRepository,
        job_repo: JobRepository,
    ) -> None:
        self._session = session
        self._workspaces = workspace_repo
        self._datasets = dataset_repo
        self._jobs = job_repo
        self._settings = get_settings()

    async def list_experiments(self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int):
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        total = await self._session.scalar(
            select(func.count()).select_from(ExperimentRow).where(
                ExperimentRow.workspace_id == workspace_id,
                ExperimentRow.user_id == user_id,
            )
        )
        rows = (
            await self._session.execute(
                select(ExperimentRow)
                .where(ExperimentRow.workspace_id == workspace_id, ExperimentRow.user_id == user_id)
                .order_by(ExperimentRow.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        return rows, int(total or 0)

    async def get_experiment(self, experiment_id: UUID, user_id: UUID) -> ExperimentRow:
        row = await self._session.get(ExperimentRow, experiment_id)
        if row is None or row.user_id != user_id:
            raise NotFoundError("Experiment not found")
        return row

    async def create_and_enqueue(
        self,
        workspace_id: UUID,
        user_id: UUID,
        *,
        dataset_version_id: UUID,
        name: str,
        task_type: str,
        target_column: str | None,
        algorithms: list[str] | None = None,
    ) -> tuple[ExperimentRow, Any]:
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        version = await self._datasets.get_version(dataset_version_id, user_id)
        if version is None or version.workspace_id != workspace_id:
            raise NotFoundError("Dataset version not found")
        if version.status != "ready":
            raise ValidationDomainError("Dataset version must be profiled (status=ready)")

        exp = ExperimentRow(
            id=uuid4(),
            workspace_id=workspace_id,
            project_id=ws.project_id,
            dataset_version_id=dataset_version_id,
            user_id=user_id,
            name=name,
            task_type=task_type,
            status="queued",
            config_json={
                "target_column": target_column,
                "algorithms": algorithms
                or ["random_forest", "logistic_regression", "xgboost"],
            },
        )
        self._session.add(exp)
        await self._session.flush()

        job = await self._jobs.create(
            user_id=user_id,
            project_id=ws.project_id,
            workspace_id=workspace_id,
            job_type="automl",
            input_json={
                "experiment_id": str(exp.id),
                "dataset_version_id": str(dataset_version_id),
                "target_column": target_column,
                "task_type": task_type,
                "algorithms": exp.config_json["algorithms"],
            },
        )
        exp.job_id = job.id
        await self._session.commit()

        from app.workers.tasks import train_experiment_task

        async_result = train_experiment_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        await self._session.commit()
        job = await self._jobs.get(job.id, user_id)
        await self._session.refresh(exp)
        return exp, job

    async def list_models(self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int):
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        total = await self._session.scalar(
            select(func.count()).select_from(ModelRow).where(
                ModelRow.workspace_id == workspace_id,
            )
        )
        rows = (
            await self._session.execute(
                select(ModelRow)
                .where(ModelRow.workspace_id == workspace_id)
                .order_by(ModelRow.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        return rows, int(total or 0)

    async def set_champion(self, model_id: UUID, user_id: UUID) -> ModelRow:
        model = await self._session.get(ModelRow, model_id)
        if model is None:
            raise NotFoundError("Model not found")
        ws = await self._workspaces.get(model.workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Model not found")
        await self._session.execute(
            update(ModelRow)
            .where(ModelRow.workspace_id == model.workspace_id)
            .values(is_champion=False)
        )
        model.is_champion = True
        await self._session.commit()
        await self._session.refresh(model)
        return model

    async def predict(
        self, model_id: UUID, user_id: UUID, rows: list[dict[str, Any]]
    ) -> PredictionRow:
        from syntrix_ml.pipeline import predict_with_artifact

        model = await self._session.get(ModelRow, model_id)
        if model is None or model.status != "ready" or not model.artifact_path:
            raise NotFoundError("Ready model not found")
        ws = await self._workspaces.get(model.workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Model not found")

        storage = SupabaseStorage(self._settings)
        artifact = await storage.download(
            bucket=storage_paths(self._settings).models, path=model.artifact_path
        )
        output = predict_with_artifact(artifact, rows)
        pred = PredictionRow(
            id=uuid4(),
            model_id=model.id,
            workspace_id=model.workspace_id,
            project_id=model.project_id,
            user_id=user_id,
            input_json={"rows": rows},
            output_json=output,
            status="completed",
        )
        self._session.add(pred)
        await self._session.commit()
        await self._session.refresh(pred)
        return pred

    async def enqueue_explain(self, model_id: UUID, user_id: UUID):
        model = await self._session.get(ModelRow, model_id)
        if model is None:
            raise NotFoundError("Model not found")
        ws = await self._workspaces.get(model.workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Model not found")
        job = await self._jobs.create(
            user_id=user_id,
            project_id=model.project_id,
            workspace_id=model.workspace_id,
            job_type="explain",
            input_json={"model_id": str(model.id)},
        )
        await self._session.commit()
        from app.workers.tasks import explain_model_task

        async_result = explain_model_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        await self._session.commit()
        return await self._jobs.get(job.id, user_id)

    async def get_explanations(self, model_id: UUID, user_id: UUID) -> dict[str, Any]:
        model = await self._session.get(ModelRow, model_id)
        if model is None:
            raise NotFoundError("Model not found")
        ws = await self._workspaces.get(model.workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Model not found")
        return dict(model.explanation_json or {})
