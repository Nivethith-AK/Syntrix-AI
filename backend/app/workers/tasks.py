"""Celery tasks — demo, profiling, EDA, AutoML, explain, reports, workflows."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.storage import SupabaseStorage, storage_paths
from app.workers.celery_app import celery_app

settings = get_settings()

# Sync engine for workers (Celery tasks are sync)
_sync_url = settings.database_url
if _sync_url.startswith("postgresql+asyncpg://"):
    _sync_url = _sync_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
elif _sync_url.startswith("postgresql://"):
    _sync_url = _sync_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif _sync_url.startswith("postgres://"):
    _sync_url = _sync_url.replace("postgres://", "postgresql+psycopg://", 1)

_engine = create_engine(_sync_url or "postgresql+psycopg://localhost/syntrix", pool_pre_ping=True)
SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


def _update_job(
    session: Session,
    job_id: UUID,
    *,
    status: str | None = None,
    progress_pct: int | None = None,
    result_json: str | None = None,
    error_message: str | None = None,
) -> None:
    sets: list[str] = ["updated_at = now()"]
    params: dict = {"job_id": str(job_id)}
    if status is not None:
        sets.append("status = cast(:status as job_status)")
        params["status"] = status
    if progress_pct is not None:
        sets.append("progress_pct = :progress_pct")
        params["progress_pct"] = progress_pct
    if result_json is not None:
        sets.append("result_json = cast(:result_json as jsonb)")
        params["result_json"] = result_json
    if error_message is not None:
        sets.append("error_message = :error_message")
        params["error_message"] = error_message
    session.execute(
        text(f"update jobs set {', '.join(sets)} where id = cast(:job_id as uuid)"),
        params,
    )
    session.commit()


def _job_cancelled(session: Session, job_id: str) -> bool:
    row = session.execute(
        text("select status from jobs where id = cast(:id as uuid)"),
        {"id": job_id},
    ).mappings().first()
    return bool(row and row["status"] == "cancelled")


def _set_dataset_states(
    session: Session,
    *,
    dataset_id: str | None,
    version_id: str,
    dataset_status: str | None,
    version_status: str,
) -> None:
    session.execute(
        text(
            "update dataset_versions set status = cast(:status as dataset_version_status), "
            "updated_at = now() where id = cast(:id as uuid)"
        ),
        {"status": version_status, "id": version_id},
    )
    if dataset_id and dataset_status:
        session.execute(
            text(
                "update datasets set status = cast(:status as dataset_status), "
                "updated_at = now() where id = cast(:id as uuid)"
            ),
            {"status": dataset_status, "id": dataset_id},
        )
    session.commit()


def _upsert_metadata(
    session: Session,
    *,
    version_id: str,
    profile: dict[str, Any],
    eda: dict[str, Any] | None = None,
) -> None:
    existing = session.execute(
        text(
            "select id from dataset_metadata "
            "where dataset_version_id = cast(:vid as uuid)"
        ),
        {"vid": version_id},
    ).mappings().first()
    payload = {
        "vid": version_id,
        "row_count": profile["row_count"],
        "column_count": profile["column_count"],
        "schema_json": json.dumps(profile["schema_json"]),
        "profile_json": json.dumps(profile["profile_json"]),
        "quality_json": json.dumps(profile["quality_json"]),
        "eda_json": json.dumps(eda or {}),
        "semantic_summary": profile.get("semantic_summary"),
        "target_candidates": json.dumps(profile.get("target_candidates") or []),
        "profiled_at": datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        session.execute(
            text(
                """
                update dataset_metadata set
                  row_count = :row_count,
                  column_count = :column_count,
                  schema_json = cast(:schema_json as jsonb),
                  profile_json = cast(:profile_json as jsonb),
                  quality_json = cast(:quality_json as jsonb),
                  eda_json = cast(:eda_json as jsonb),
                  semantic_summary = :semantic_summary,
                  target_candidates = cast(:target_candidates as jsonb),
                  profiled_at = cast(:profiled_at as timestamptz),
                  updated_at = now()
                where dataset_version_id = cast(:vid as uuid)
                """
            ),
            payload,
        )
    else:
        session.execute(
            text(
                """
                insert into dataset_metadata (
                  id, dataset_version_id, row_count, column_count,
                  schema_json, profile_json, quality_json, eda_json,
                  semantic_summary, target_candidates, profiled_at
                ) values (
                  gen_random_uuid(), cast(:vid as uuid), :row_count, :column_count,
                  cast(:schema_json as jsonb), cast(:profile_json as jsonb),
                  cast(:quality_json as jsonb), cast(:eda_json as jsonb),
                  :semantic_summary, cast(:target_candidates as jsonb),
                  cast(:profiled_at as timestamptz)
                )
                """
            ),
            payload,
        )
    session.commit()


def _load_version_frame(session: Session, version_id: str):
    from syntrix_ml.io import load_tabular

    row = session.execute(
        text(
            "select storage_path, "
            "(select original_filename from datasets d where d.id = dv.dataset_id) as original_filename "
            "from dataset_versions dv where id = cast(:id as uuid)"
        ),
        {"id": version_id},
    ).mappings().first()
    if row is None:
        raise ValueError("Dataset version not found")
    storage = SupabaseStorage(settings)
    bucket = storage_paths(settings).datasets
    content = storage.download_sync(bucket=bucket, path=row["storage_path"])
    filename = row["original_filename"] or row["storage_path"].rsplit("/", 1)[-1]
    return load_tabular(content, filename=filename)


@celery_app.task(name="app.workers.tasks.demo_hello_task", bind=True, queue="default")
def demo_hello_task(self, job_id: str) -> dict:
    """Demo async job: marks progress then succeeds with a greeting."""
    jid = UUID(job_id)
    with SessionLocal() as session:
        try:
            row = session.execute(
                text("select input_json from jobs where id = cast(:id as uuid)"),
                {"id": job_id},
            ).mappings().first()
            message = "hello from Syntrix"
            if row and row["input_json"]:
                payload = row["input_json"]
                if isinstance(payload, dict):
                    message = str(payload.get("message") or message)

            _update_job(session, jid, status="running", progress_pct=10)
            time.sleep(1)
            _update_job(session, jid, progress_pct=50)
            time.sleep(1)
            result = {
                "greeting": f"{message} (job {job_id})",
                "celery_task_id": self.request.id,
            }
            _update_job(
                session,
                jid,
                status="succeeded",
                progress_pct=100,
                result_json=json.dumps(result),
            )
            return result
        except Exception as exc:  # noqa: BLE001
            _update_job(
                session,
                jid,
                status="failed",
                progress_pct=100,
                error_message=str(exc),
            )
            raise


@celery_app.task(name="app.workers.tasks.profile_dataset_task", bind=True, queue="default")
def profile_dataset_task(self, job_id: str) -> dict:
    """Download dataset from Storage, validate/profile via ml-engine, persist metadata."""
    from syntrix_ml.eda import build_eda_insights
    from syntrix_ml.profile import profile_dataframe
    from syntrix_ml.validate import validate_dataframe

    jid = UUID(job_id)
    with SessionLocal() as session:
        dataset_id = None
        version_id = None
        try:
            row = session.execute(
                text("select input_json from jobs where id = cast(:id as uuid)"),
                {"id": job_id},
            ).mappings().first()
            if row is None:
                raise ValueError("Job not found")
            payload = row["input_json"] or {}
            dataset_id = str(payload.get("dataset_id") or "")
            version_id = str(payload.get("dataset_version_id") or "")
            if not version_id:
                raise ValueError("dataset_version_id missing from job input")

            if _job_cancelled(session, job_id):
                return {"cancelled": True}

            _update_job(session, jid, status="running", progress_pct=5)
            _set_dataset_states(
                session,
                dataset_id=dataset_id or None,
                version_id=version_id,
                dataset_status="profiling",
                version_status="profiling",
            )

            _update_job(session, jid, progress_pct=20)
            df = _load_version_frame(session, version_id)
            if _job_cancelled(session, job_id):
                return {"cancelled": True}

            _update_job(session, jid, progress_pct=40)
            validation = validate_dataframe(df)
            if not validation.ok:
                raise ValueError("; ".join(validation.errors))

            _update_job(session, jid, progress_pct=60)
            profile = profile_dataframe(df)
            eda = build_eda_insights(df, profile=profile)

            _update_job(session, jid, progress_pct=85)
            _upsert_metadata(session, version_id=version_id, profile=profile, eda=eda)
            _set_dataset_states(
                session,
                dataset_id=dataset_id or None,
                version_id=version_id,
                dataset_status="ready",
                version_status="ready",
            )

            result = {
                "dataset_version_id": version_id,
                "row_count": profile["row_count"],
                "column_count": profile["column_count"],
                "semantic_summary": profile.get("semantic_summary"),
                "celery_task_id": self.request.id,
            }
            _update_job(
                session,
                jid,
                status="succeeded",
                progress_pct=100,
                result_json=json.dumps(result),
            )
            return result
        except Exception as exc:  # noqa: BLE001
            if version_id:
                _set_dataset_states(
                    session,
                    dataset_id=dataset_id or None,
                    version_id=version_id,
                    dataset_status="failed",
                    version_status="failed",
                )
            _update_job(
                session,
                jid,
                status="failed",
                progress_pct=100,
                error_message=str(exc),
            )
            raise


@celery_app.task(name="app.workers.tasks.eda_dataset_task", bind=True, queue="default")
def eda_dataset_task(self, job_id: str) -> dict:
    """Recompute EDA insights for an existing dataset version."""
    from syntrix_ml.eda import build_eda_insights
    from syntrix_ml.profile import profile_dataframe

    jid = UUID(job_id)
    with SessionLocal() as session:
        version_id = None
        try:
            row = session.execute(
                text("select input_json from jobs where id = cast(:id as uuid)"),
                {"id": job_id},
            ).mappings().first()
            if row is None:
                raise ValueError("Job not found")
            payload = row["input_json"] or {}
            version_id = str(payload.get("dataset_version_id") or "")
            if not version_id:
                raise ValueError("dataset_version_id missing from job input")

            if _job_cancelled(session, job_id):
                return {"cancelled": True}

            _update_job(session, jid, status="running", progress_pct=10)
            df = _load_version_frame(session, version_id)
            _update_job(session, jid, progress_pct=45)
            profile = profile_dataframe(df)
            eda = build_eda_insights(df, profile=profile)
            _update_job(session, jid, progress_pct=80)
            _upsert_metadata(session, version_id=version_id, profile=profile, eda=eda)

            result = {
                "dataset_version_id": version_id,
                "insight_count": len(eda.get("insights") or []),
                "celery_task_id": self.request.id,
            }
            _update_job(
                session,
                jid,
                status="succeeded",
                progress_pct=100,
                result_json=json.dumps(result),
            )
            return result
        except Exception as exc:  # noqa: BLE001
            _update_job(
                session,
                jid,
                status="failed",
                progress_pct=100,
                error_message=str(exc),
            )
            raise


def _insert_activity(
    session: Session,
    *,
    agent_run_id: str | None,
    workspace_id: str,
    project_id: str,
    user_id: str,
    job_id: str | None,
    agent_name: str,
    activity_type: str,
    status: str,
    payload: dict[str, Any],
) -> None:
    session.execute(
        text(
            """
            insert into agent_activities (
              id, agent_run_id, workspace_id, project_id, user_id, job_id,
              agent_name, activity_type, status, payload_json, started_at, completed_at
            ) values (
              gen_random_uuid(), cast(:agent_run_id as uuid), cast(:workspace_id as uuid),
              cast(:project_id as uuid), cast(:user_id as uuid), cast(:job_id as uuid),
              :agent_name, :activity_type, cast(:status as activity_status),
              cast(:payload as jsonb), now(), now()
            )
            """
        ),
        {
            "agent_run_id": agent_run_id,
            "workspace_id": workspace_id,
            "project_id": project_id,
            "user_id": user_id,
            "job_id": job_id,
            "agent_name": agent_name,
            "activity_type": activity_type,
            "status": status
            if status in {"started", "succeeded", "failed", "waiting_human"}
            else "succeeded",
            "payload": json.dumps(payload),
        },
    )
    session.commit()


@celery_app.task(name="app.workers.tasks.train_experiment_task", bind=True, queue="default")
def train_experiment_task(self, job_id: str) -> dict:
    """Train models and register artifacts in Storage + models table."""
    from uuid import uuid4

    from syntrix_ml.pipeline import train_experiment

    jid = UUID(job_id)
    with SessionLocal() as session:
        experiment_id = None
        try:
            row = session.execute(
                text(
                    "select input_json, user_id, project_id, workspace_id from jobs "
                    "where id = cast(:id as uuid)"
                ),
                {"id": job_id},
            ).mappings().first()
            if row is None:
                raise ValueError("Job not found")
            payload = row["input_json"] or {}
            experiment_id = str(payload.get("experiment_id") or "")
            version_id = str(payload.get("dataset_version_id") or "")
            target = payload.get("target_column")
            task_type = str(payload.get("task_type") or "classification")
            algorithms = payload.get("algorithms") or [
                "random_forest",
                "logistic_regression",
                "xgboost",
            ]

            _update_job(session, jid, status="running", progress_pct=5)
            session.execute(
                text(
                    "update experiments set status = cast('running' as run_status), "
                    "started_at = now(), updated_at = now() where id = cast(:id as uuid)"
                ),
                {"id": experiment_id},
            )
            session.commit()

            df = _load_version_frame(session, version_id)
            _update_job(session, jid, progress_pct=25)
            result = train_experiment(
                df,
                task_type=task_type,
                target_column=target,
                algorithms=list(algorithms),
                mlflow_tracking_uri=settings.mlflow_tracking_uri or None,
            )
            _update_job(session, jid, progress_pct=70)

            storage = SupabaseStorage(settings)
            models_bucket = storage_paths(settings).models
            model_summaries = []
            for model in result.models:
                mid = str(uuid4())
                path = (
                    f"{row['user_id']}/{row['project_id']}/{row['workspace_id']}/"
                    f"{experiment_id}/{model.algorithm}.joblib"
                )
                storage.upload_sync(
                    bucket=models_bucket,
                    path=path,
                    data=model.artifact_bytes,
                    content_type="application/octet-stream",
                    upsert=True,
                )
                session.execute(
                    text(
                        """
                        insert into models (
                          id, experiment_id, workspace_id, project_id, name, algorithm, task_type,
                          artifact_path, metrics_json, params_json, feature_schema_json,
                          is_champion, status
                        ) values (
                          cast(:id as uuid), cast(:experiment_id as uuid), cast(:workspace_id as uuid),
                          cast(:project_id as uuid), :name, :algorithm, cast(:task_type as task_type),
                          :artifact_path, cast(:metrics as jsonb), cast(:params as jsonb),
                          cast(:features as jsonb), :is_champion, cast('ready' as model_status)
                        )
                        """
                    ),
                    {
                        "id": mid,
                        "experiment_id": experiment_id,
                        "workspace_id": str(row["workspace_id"]),
                        "project_id": str(row["project_id"]),
                        "name": model.algorithm,
                        "algorithm": model.algorithm,
                        "task_type": task_type,
                        "artifact_path": path,
                        "metrics": json.dumps(model.metrics),
                        "params": json.dumps(model.params),
                        "features": json.dumps(model.feature_schema),
                        "is_champion": bool(model.is_best),
                    },
                )
                model_summaries.append(
                    {
                        "id": mid,
                        "algorithm": model.algorithm,
                        "metrics": model.metrics,
                        "is_best": model.is_best,
                    }
                )
            session.execute(
                text(
                    """
                    update experiments set
                      status = cast('succeeded' as run_status),
                      metrics_json = cast(:metrics as jsonb),
                      mlflow_run_id = :mlflow_run_id,
                      completed_at = now(),
                      updated_at = now()
                    where id = cast(:id as uuid)
                    """
                ),
                {
                    "id": experiment_id,
                    "metrics": json.dumps(
                        {
                            "best_algorithm": result.best_algorithm,
                            "best_score": result.best_score,
                            "models": model_summaries,
                        }
                    ),
                    "mlflow_run_id": result.mlflow_run_id,
                },
            )
            session.commit()
            out = {
                "experiment_id": experiment_id,
                "best_algorithm": result.best_algorithm,
                "best_score": result.best_score,
                "model_count": len(model_summaries),
                "mlflow_run_id": result.mlflow_run_id,
            }
            _update_job(
                session, jid, status="succeeded", progress_pct=100, result_json=json.dumps(out)
            )
            return out
        except Exception as exc:  # noqa: BLE001
            if experiment_id:
                session.execute(
                    text(
                        "update experiments set status = cast('failed' as run_status), "
                        "completed_at = now(), updated_at = now() where id = cast(:id as uuid)"
                    ),
                    {"id": experiment_id},
                )
                session.commit()
            _update_job(session, jid, status="failed", progress_pct=100, error_message=str(exc))
            raise


@celery_app.task(name="app.workers.tasks.explain_model_task", bind=True, queue="default")
def explain_model_task(self, job_id: str) -> dict:
    from syntrix_ml.explain import explain_model

    jid = UUID(job_id)
    with SessionLocal() as session:
        try:
            row = session.execute(
                text("select input_json from jobs where id = cast(:id as uuid)"),
                {"id": job_id},
            ).mappings().first()
            payload = (row or {}).get("input_json") or {}
            model_id = str(payload.get("model_id") or "")
            model = session.execute(
                text(
                    "select id, artifact_path, workspace_id from models where id = cast(:id as uuid)"
                ),
                {"id": model_id},
            ).mappings().first()
            if model is None or not model["artifact_path"]:
                raise ValueError("Model artifact missing")

            _update_job(session, jid, status="running", progress_pct=15)
            storage = SupabaseStorage(settings)
            artifact = storage.download_sync(
                bucket=storage_paths(settings).models, path=model["artifact_path"]
            )
            ver = session.execute(
                text(
                    """
                    select id from dataset_versions
                    where workspace_id = cast(:ws as uuid) and status = 'ready'
                    order by created_at desc limit 1
                    """
                ),
                {"ws": str(model["workspace_id"])},
            ).mappings().first()
            if ver is None:
                raise ValueError("No ready dataset version for explanation sample")
            df = _load_version_frame(session, str(ver["id"]))
            _update_job(session, jid, progress_pct=55)
            explanation = explain_model(artifact, df)
            session.execute(
                text(
                    "update models set explanation_json = cast(:ex as jsonb), updated_at = now() "
                    "where id = cast(:id as uuid)"
                ),
                {"ex": json.dumps(explanation), "id": model_id},
            )
            session.commit()
            out = {"model_id": model_id, "method": explanation.get("method")}
            _update_job(
                session, jid, status="succeeded", progress_pct=100, result_json=json.dumps(out)
            )
            return out
        except Exception as exc:  # noqa: BLE001
            _update_job(session, jid, status="failed", progress_pct=100, error_message=str(exc))
            raise


@celery_app.task(name="app.workers.tasks.generate_report_task", bind=True, queue="default")
def generate_report_task(self, job_id: str) -> dict:
    from syntrix_ml.reporting import build_markdown_report, markdown_to_pdf

    jid = UUID(job_id)
    with SessionLocal() as session:
        report_id = None
        try:
            row = session.execute(
                text(
                    "select input_json, user_id, project_id, workspace_id from jobs "
                    "where id = cast(:id as uuid)"
                ),
                {"id": job_id},
            ).mappings().first()
            payload = (row or {}).get("input_json") or {}
            report_id = str(payload.get("report_id") or "")
            _update_job(session, jid, status="running", progress_pct=10)

            report = session.execute(
                text("select * from reports where id = cast(:id as uuid)"),
                {"id": report_id},
            ).mappings().first()
            if report is None:
                raise ValueError("Report not found")

            meta = session.execute(
                text(
                    """
                    select dm.semantic_summary, dm.eda_json, dm.quality_json
                    from dataset_metadata dm
                    join dataset_versions dv on dv.id = dm.dataset_version_id
                    where dv.workspace_id = cast(:ws as uuid)
                    order by dm.profiled_at desc nulls last limit 1
                    """
                ),
                {"ws": str(row["workspace_id"])},
            ).mappings().first()
            exp = None
            if payload.get("experiment_id"):
                exp = session.execute(
                    text("select * from experiments where id = cast(:id as uuid)"),
                    {"id": payload["experiment_id"]},
                ).mappings().first()
            explanation: dict[str, Any] = {}
            if payload.get("model_id"):
                m = session.execute(
                    text(
                        "select explanation_json from models where id = cast(:id as uuid)"
                    ),
                    {"id": payload["model_id"]},
                ).mappings().first()
                if m:
                    explanation = dict(m["explanation_json"] or {})

            eda = dict((meta or {}).get("eda_json") or {})
            experiment_payload = None
            if exp:
                metrics = exp["metrics_json"] or {}
                experiment_payload = {
                    "task_type": str(exp["task_type"]),
                    "target_column": (exp["config_json"] or {}).get("target_column"),
                    "best_algorithm": metrics.get("best_algorithm"),
                    "best_score": metrics.get("best_score"),
                    "models": metrics.get("models") or [],
                }

            md = build_markdown_report(
                title=report["title"],
                semantic_summary=(meta or {}).get("semantic_summary"),
                eda=eda,
                experiment=experiment_payload,
                explanations=explanation or None,
            )
            pdf = markdown_to_pdf(md, title=report["title"])
            _update_job(session, jid, progress_pct=70)

            storage = SupabaseStorage(settings)
            bucket = storage_paths(settings).reports
            base = f"{row['user_id']}/{row['project_id']}/{row['workspace_id']}/{report_id}"
            md_path = f"{base}/report.md"
            pdf_path = f"{base}/report.pdf"
            storage.upload_sync(
                bucket=bucket,
                path=md_path,
                data=md.encode("utf-8"),
                content_type="text/markdown",
            )
            storage.upload_sync(
                bucket=bucket, path=pdf_path, data=pdf, content_type="application/pdf"
            )
            session.execute(
                text(
                    """
                    update reports set
                      content_md = :md,
                      storage_path_md = :md_path,
                      storage_path_pdf = :pdf_path,
                      status = cast('ready' as report_status),
                      updated_at = now()
                    where id = cast(:id as uuid)
                    """
                ),
                {"id": report_id, "md": md, "md_path": md_path, "pdf_path": pdf_path},
            )
            session.commit()
            out = {
                "report_id": report_id,
                "storage_path_md": md_path,
                "storage_path_pdf": pdf_path,
            }
            _update_job(
                session, jid, status="succeeded", progress_pct=100, result_json=json.dumps(out)
            )
            return out
        except Exception as exc:  # noqa: BLE001
            if report_id:
                session.execute(
                    text(
                        "update reports set status = cast('failed' as report_status), "
                        "updated_at = now() where id = cast(:id as uuid)"
                    ),
                    {"id": report_id},
                )
                session.commit()
            _update_job(session, jid, status="failed", progress_pct=100, error_message=str(exc))
            raise


@celery_app.task(name="app.workers.tasks.run_workflow_task", bind=True, queue="default")
def run_workflow_task(self, job_id: str) -> dict:
    """Execute LangGraph supervisor workflow and persist agent activities."""
    from syntrix_ai.graphs.workflow import build_workflow_graph, get_postgres_checkpointer
    from syntrix_ml.eda import build_eda_insights
    from syntrix_ml.pipeline import train_experiment as _train
    from syntrix_ml.profile import profile_dataframe
    from syntrix_ml.reporting import build_markdown_report

    jid = UUID(job_id)
    with SessionLocal() as session:
        run_id = None
        try:
            job = session.execute(
                text("select * from jobs where id = cast(:id as uuid)"),
                {"id": job_id},
            ).mappings().first()
            if job is None:
                raise ValueError("Job not found")
            payload = job["input_json"] or {}
            run_id = str(payload.get("agent_run_id") or "")
            workflow_type = str(payload.get("workflow_type") or "eda")
            version_id = payload.get("dataset_version_id")
            human = payload.get("human_response") or {}

            run = session.execute(
                text("select * from agent_runs where id = cast(:id as uuid)"),
                {"id": run_id},
            ).mappings().first()
            if run is None:
                raise ValueError("Agent run not found")

            _update_job(session, jid, status="running", progress_pct=5)
            session.execute(
                text(
                    "update agent_runs set status = cast('running' as run_status), "
                    "started_at = coalesce(started_at, now()), updated_at = now() "
                    "where id = cast(:id as uuid)"
                ),
                {"id": run_id},
            )
            session.commit()

            def profile_dataset(vid: str) -> dict:
                df = _load_version_frame(session, vid)
                profile = profile_dataframe(df)
                eda = build_eda_insights(df, profile=profile)
                _upsert_metadata(session, version_id=vid, profile=profile, eda=eda)
                return {
                    "row_count": profile["row_count"],
                    "column_count": profile["column_count"],
                    "semantic_summary": profile.get("semantic_summary"),
                    "eda": eda,
                    "insights": eda.get("insights"),
                }

            def build_eda(vid: str) -> dict:
                return profile_dataset(vid).get("eda") or {}

            def train(vid: str, target_column=None, task_type="classification"):
                df = _load_version_frame(session, vid)
                result = _train(
                    df,
                    task_type=task_type or "classification",
                    target_column=target_column,
                    algorithms=["random_forest", "logistic_regression"],
                    mlflow_tracking_uri=None,
                )
                return {
                    "best_algorithm": result.best_algorithm,
                    "best_score": result.best_score,
                    "task_type": result.task_type,
                    "target_column": target_column,
                    "models": [
                        {"algorithm": m.algorithm, "metrics": m.metrics} for m in result.models
                    ],
                }

            def explain(state: dict) -> dict:
                return {
                    "method": "deferred",
                    "message": "Use /models/{id}/explain for full SHAP",
                }

            def report(state: dict) -> str:
                return build_markdown_report(
                    title="Agent workflow report",
                    semantic_summary=((state.get("eda") or {}).get("semantic_summary")),
                    eda=(state.get("eda") or {}).get("eda") or state.get("eda"),
                    experiment=state.get("experiment"),
                    explanations=state.get("explanation"),
                )

            tools = {
                "profile_dataset": profile_dataset,
                "build_eda": build_eda,
                "train": train,
                "explain": explain,
                "report": report,
            }
            checkpointer = get_postgres_checkpointer(settings.database_url)
            graph = build_workflow_graph(tools, checkpointer=checkpointer)
            initial = {
                "workspace_id": str(job["workspace_id"]),
                "project_id": str(job["project_id"]),
                "user_id": str(job["user_id"]),
                "workflow_type": workflow_type,
                "dataset_version_id": str(version_id) if version_id else None,
                "target_column": human.get("target_column") or payload.get("target_column"),
                "task_type": human.get("task_type")
                or payload.get("task_type")
                or "classification",
                "human_response": human or None,
                "messages": [],
                "activities": [],
            }
            config = {
                "configurable": {"thread_id": run.get("checkpoint_thread_id") or run_id}
            }
            _update_job(session, jid, progress_pct=30)
            final = graph.invoke(initial, config=config)

            for act in final.get("activities") or []:
                status = (
                    "waiting_human"
                    if act.get("activity_type") == "await_human"
                    else "succeeded"
                )
                _insert_activity(
                    session,
                    agent_run_id=run_id,
                    workspace_id=str(job["workspace_id"]),
                    project_id=str(job["project_id"]),
                    user_id=str(job["user_id"]),
                    job_id=job_id,
                    agent_name=act.get("agent_name") or "agent",
                    activity_type=act.get("activity_type") or "step",
                    status=status,
                    payload=act.get("payload_json") or {},
                )

            run_status = "waiting_human" if final.get("waiting_human") else "succeeded"
            session.execute(
                text(
                    """
                    update agent_runs set
                      status = cast(:status as run_status),
                      result_json = cast(:result as jsonb),
                      completed_at = case when :status = 'succeeded' then now() else completed_at end,
                      updated_at = now()
                    where id = cast(:id as uuid)
                    """
                ),
                {
                    "id": run_id,
                    "status": run_status,
                    "result": json.dumps(
                        final.get("result") or {"messages": final.get("messages")}
                    ),
                },
            )
            session.commit()
            out = {
                "agent_run_id": run_id,
                "status": run_status,
                "workflow_type": workflow_type,
            }
            _update_job(
                session, jid, status="succeeded", progress_pct=100, result_json=json.dumps(out)
            )
            return out
        except Exception as exc:  # noqa: BLE001
            if run_id:
                session.execute(
                    text(
                        "update agent_runs set status = cast('failed' as run_status), "
                        "error_message = :err, completed_at = now(), updated_at = now() "
                        "where id = cast(:id as uuid)"
                    ),
                    {"id": run_id, "err": str(exc)},
                )
                session.commit()
            _update_job(session, jid, status="failed", progress_pct=100, error_message=str(exc))
            raise
