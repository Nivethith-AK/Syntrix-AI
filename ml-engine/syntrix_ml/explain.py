"""SHAP (+ optional LIME-style fallback) explanations."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from syntrix_ml.pipeline import load_artifact


def explain_model(
    artifact_bytes: bytes,
    df: pd.DataFrame,
    *,
    max_samples: int = 100,
) -> dict[str, Any]:
    payload = load_artifact(artifact_bytes)
    pipe = payload["pipeline"]
    meta = payload.get("meta") or {}
    task = meta.get("task_type")
    if task == "clustering":
        return {
            "method": "feature_importance_proxy",
            "message": "Clustering models use variance proxy instead of SHAP",
            "global": [],
        }

    features = meta.get("features") or [c for c in df.columns if c != meta.get("target_column")]
    X = df.reindex(columns=features)
    if len(X) > max_samples:
        X = X.sample(max_samples, random_state=42)

    try:
        import shap

        # Transform through preprocessor when available
        if hasattr(pipe, "named_steps") and "prep" in pipe.named_steps:
            Xt = pipe.named_steps["prep"].transform(X)
            model = pipe.named_steps["model"]
            feature_names = list(features)
            try:
                feature_names = list(pipe.named_steps["prep"].get_feature_names_out())
            except Exception:  # noqa: BLE001
                pass
            explainer = shap.Explainer(model, Xt)
            shap_values = explainer(Xt)
            values = getattr(shap_values, "values", shap_values)
            if isinstance(values, list):
                values = values[0]
            arr = np.array(values)
            if arr.ndim == 3:
                arr = arr.mean(axis=2)
            mean_abs = np.abs(arr).mean(axis=0)
            global_importance = [
                {"feature": str(feature_names[i] if i < len(feature_names) else i), "importance": float(mean_abs[i])}
                for i in range(len(mean_abs))
            ]
            global_importance.sort(key=lambda x: x["importance"], reverse=True)
            return {
                "method": "shap",
                "global": global_importance[:40],
                "sample_count": int(len(X)),
                "algorithm": meta.get("algorithm"),
            }
    except Exception as exc:  # noqa: BLE001
        # Fallback: tree/linear coef proxy
        return _fallback_importance(pipe, features, error=str(exc))

    return _fallback_importance(pipe, features)


def _fallback_importance(pipe: Any, features: list[str], error: str | None = None) -> dict[str, Any]:
    model = pipe.named_steps.get("model", pipe) if hasattr(pipe, "named_steps") else pipe
    importances: list[float] = []
    names = features
    if hasattr(model, "feature_importances_"):
        importances = [float(x) for x in model.feature_importances_]
    elif hasattr(model, "coef_"):
        coef = np.array(model.coef_)
        if coef.ndim > 1:
            coef = np.abs(coef).mean(axis=0)
        importances = [float(x) for x in np.abs(coef)]
    else:
        importances = [0.0 for _ in features]
    try:
        if hasattr(pipe, "named_steps") and "prep" in pipe.named_steps:
            names = list(pipe.named_steps["prep"].get_feature_names_out())
    except Exception:  # noqa: BLE001
        pass
    global_importance = [
        {"feature": str(names[i] if i < len(names) else i), "importance": importances[i] if i < len(importances) else 0.0}
        for i in range(max(len(names), len(importances)))
    ]
    global_importance.sort(key=lambda x: x["importance"], reverse=True)
    return {
        "method": "model_coefficients",
        "global": global_importance[:40],
        "fallback_error": error,
    }
