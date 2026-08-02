"""Deterministic ML pipeline: validate → clean → features → train → eval → predict."""

from __future__ import annotations

import io
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.cluster import KMeans

from syntrix_ml.validate import validate_dataframe

try:
    from xgboost import XGBClassifier, XGBRegressor

    HAS_XGB = True
except Exception:  # noqa: BLE001
    HAS_XGB = False


@dataclass(slots=True)
class TrainResult:
    algorithm: str
    task_type: str
    metrics: dict[str, Any]
    params: dict[str, Any]
    feature_schema: dict[str, Any]
    artifact_bytes: bytes
    is_best: bool = False


@dataclass(slots=True)
class ExperimentResult:
    task_type: str
    target_column: str | None
    models: list[TrainResult] = field(default_factory=list)
    best_algorithm: str | None = None
    best_score: float | None = None
    mlflow_run_id: str | None = None


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out = out.drop_duplicates()
    # Drop columns that are entirely null
    out = out.dropna(axis=1, how="all")
    return out


def _split_xy(df: pd.DataFrame, target: str) -> tuple[pd.DataFrame, pd.Series]:
    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found")
    y = df[target]
    X = df.drop(columns=[target])
    return X, y


def _build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    numeric_cols = X.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_cols = [c for c in X.columns if c not in numeric_cols]
    transformers = []
    if numeric_cols:
        transformers.append(
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_cols,
            )
        )
    if categorical_cols:
        transformers.append(
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "onehot",
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                        ),
                    ]
                ),
                categorical_cols,
            )
        )
    if not transformers:
        raise ValueError("No usable feature columns after cleaning")
    return ColumnTransformer(transformers=transformers)


def _estimators(task_type: str, algorithms: list[str]) -> dict[str, Any]:
    algos = {a.lower() for a in algorithms}
    out: dict[str, Any] = {}
    if task_type == "classification":
        if "random_forest" in algos or "rf" in algos:
            out["random_forest"] = RandomForestClassifier(
                n_estimators=80, max_depth=8, random_state=42, n_jobs=-1
            )
        if "logistic_regression" in algos or "logreg" in algos:
            out["logistic_regression"] = LogisticRegression(max_iter=400, random_state=42)
        if ("xgboost" in algos or "xgb" in algos) and HAS_XGB:
            out["xgboost"] = XGBClassifier(
                n_estimators=80,
                max_depth=5,
                learning_rate=0.1,
                subsample=0.9,
                eval_metric="logloss",
                random_state=42,
                n_jobs=-1,
            )
    elif task_type == "regression":
        if "random_forest" in algos or "rf" in algos:
            out["random_forest"] = RandomForestRegressor(
                n_estimators=80, max_depth=8, random_state=42, n_jobs=-1
            )
        if "logistic_regression" in algos or "ridge" in algos or "linear" in algos:
            out["ridge"] = Ridge(random_state=42)
        if ("xgboost" in algos or "xgb" in algos) and HAS_XGB:
            out["xgboost"] = XGBRegressor(
                n_estimators=80, max_depth=5, learning_rate=0.1, random_state=42, n_jobs=-1
            )
    elif task_type == "clustering":
        out["kmeans"] = KMeans(n_clusters=3, random_state=42, n_init=10)
    if not out:
        raise ValueError(f"No algorithms available for task_type={task_type}")
    return out


def _score_classification(y_true, y_pred, y_proba) -> dict[str, Any]:
    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
    }
    try:
        if y_proba is not None:
            if y_proba.ndim == 2 and y_proba.shape[1] == 2:
                metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba[:, 1]))
            else:
                metrics["roc_auc"] = float(
                    roc_auc_score(y_true, y_proba, multi_class="ovr", average="weighted")
                )
    except Exception:  # noqa: BLE001
        pass
    metrics["primary"] = metrics.get("f1_weighted", metrics["accuracy"])
    return metrics


def _score_regression(y_true, y_pred) -> dict[str, Any]:
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    metrics = {
        "rmse": rmse,
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
    }
    metrics["primary"] = metrics["r2"]
    return metrics


def _dump_artifact(pipe: Any, meta: dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    joblib.dump({"pipeline": pipe, "meta": meta}, buf)
    return buf.getvalue()


def load_artifact(data: bytes) -> dict[str, Any]:
    return joblib.load(io.BytesIO(data))


def train_experiment(
    df: pd.DataFrame,
    *,
    task_type: str,
    target_column: str | None,
    algorithms: list[str] | None = None,
    test_size: float = 0.2,
    mlflow_tracking_uri: str | None = None,
    experiment_name: str = "syntrix",
) -> ExperimentResult:
    validation = validate_dataframe(df)
    if not validation.ok:
        raise ValueError("; ".join(validation.errors))

    cleaned = clean_dataframe(df)
    algorithms = algorithms or ["random_forest", "logistic_regression", "xgboost"]
    task_type = task_type.lower()
    estimators = _estimators(task_type, algorithms)

    mlflow_run_id = None
    mlflow_active = False
    if mlflow_tracking_uri:
        try:
            import mlflow

            mlflow.set_tracking_uri(mlflow_tracking_uri)
            mlflow.set_experiment(experiment_name)
            mlflow.start_run(run_name=f"{task_type}-train")
            mlflow_run_id = mlflow.active_run().info.run_id if mlflow.active_run() else None
            mlflow_active = True
        except Exception:  # noqa: BLE001
            mlflow_active = False
            mlflow_run_id = None

    results: list[TrainResult] = []
    try:
        if task_type == "clustering":
            X = cleaned.select_dtypes(include=["number"]).fillna(0)
            if X.shape[1] < 1:
                raise ValueError("Clustering requires numeric columns")
            for name, est in estimators.items():
                labels = est.fit_predict(X)
                sil = float(silhouette_score(X, labels)) if len(set(labels)) > 1 else 0.0
                metrics = {"silhouette": sil, "primary": sil, "n_clusters": int(getattr(est, "n_clusters", 0))}
                meta = {"task_type": task_type, "algorithm": name, "features": list(X.columns)}
                artifact = _dump_artifact(est, meta)
                results.append(
                    TrainResult(
                        algorithm=name,
                        task_type=task_type,
                        metrics=metrics,
                        params={"n_clusters": int(getattr(est, "n_clusters", 3))},
                        feature_schema={"features": list(X.columns)},
                        artifact_bytes=artifact,
                    )
                )
                if mlflow_active:
                    import mlflow

                    with mlflow.start_run(run_name=name, nested=True):
                        mlflow.log_metrics({k: float(v) for k, v in metrics.items() if isinstance(v, (int, float))})
        else:
            if not target_column:
                raise ValueError("target_column is required")
            X, y = _split_xy(cleaned, target_column)
            if task_type == "classification":
                y = y.astype("string")
            preprocessor = _build_preprocessor(X)
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42,
                stratify=y if task_type == "classification" and y.nunique() > 1 else None,
            )
            for name, est in estimators.items():
                pipe = Pipeline(steps=[("prep", preprocessor), ("model", est)])
                pipe.fit(X_train, y_train)
                pred = pipe.predict(X_test)
                if task_type == "classification":
                    proba = pipe.predict_proba(X_test) if hasattr(pipe, "predict_proba") else None
                    metrics = _score_classification(y_test, pred, proba)
                else:
                    metrics = _score_regression(y_test, pred)
                meta = {
                    "task_type": task_type,
                    "algorithm": name,
                    "target_column": target_column,
                    "features": list(X.columns),
                }
                artifact = _dump_artifact(pipe, meta)
                results.append(
                    TrainResult(
                        algorithm=name,
                        task_type=task_type,
                        metrics=metrics,
                        params={},
                        feature_schema={"features": list(X.columns), "target": target_column},
                        artifact_bytes=artifact,
                    )
                )
                if mlflow_active:
                    import mlflow

                    with mlflow.start_run(run_name=name, nested=True):
                        mlflow.log_params({"algorithm": name, "task_type": task_type})
                        mlflow.log_metrics(
                            {k: float(v) for k, v in metrics.items() if isinstance(v, (int, float))}
                        )
    finally:
        if mlflow_active:
            import mlflow

            mlflow.end_run()

    if not results:
        raise ValueError("Training produced no models")

    # Higher primary is better for all current metrics (r2, f1, silhouette)
    best = max(results, key=lambda r: float(r.metrics.get("primary", -1e18)))
    for r in results:
        r.is_best = r.algorithm == best.algorithm

    return ExperimentResult(
        task_type=task_type,
        target_column=target_column,
        models=results,
        best_algorithm=best.algorithm,
        best_score=float(best.metrics.get("primary", 0)),
        mlflow_run_id=mlflow_run_id,
    )


def predict_with_artifact(artifact_bytes: bytes, rows: list[dict[str, Any]]) -> dict[str, Any]:
    payload = load_artifact(artifact_bytes)
    model = payload["pipeline"]
    meta = payload.get("meta") or {}
    df = pd.DataFrame(rows)
    if meta.get("task_type") == "clustering":
        feats = meta.get("features") or list(df.select_dtypes(include=["number"]).columns)
        X = df.reindex(columns=feats).fillna(0)
        preds = model.predict(X)
        return {"predictions": [int(p) for p in preds], "task_type": "clustering"}
    target = meta.get("target_column")
    feats = meta.get("features")
    if feats:
        X = df.reindex(columns=feats)
    elif target and target in df.columns:
        X = df.drop(columns=[target])
    else:
        X = df
    preds = model.predict(X)
    out: dict[str, Any] = {
        "predictions": [_jsonable(p) for p in preds],
        "task_type": meta.get("task_type"),
        "algorithm": meta.get("algorithm"),
    }
    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X)
            out["probabilities"] = [[_jsonable(v) for v in row] for row in proba.tolist()]
        except Exception:  # noqa: BLE001
            pass
    return out


def _jsonable(v: Any) -> Any:
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v if isinstance(v, (str, int, float, bool)) or v is None else str(v)
