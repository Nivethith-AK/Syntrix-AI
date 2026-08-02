"""Pandas-based dataset profiling."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from syntrix_ml.validate import validate_dataframe

PROFILE_SAMPLE_ROWS = 50_000
HISTOGRAM_BINS = 20
TOP_CATEGORIES = 15
MAX_CORR_COLUMNS = 40


def _json_safe(value: Any) -> Any:
    if value is None or (isinstance(value, float) and (np.isnan(value) or np.isinf(value))):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, (pd.Timedelta,)):
        return str(value)
    return value


def _infer_semantic_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    nunique = series.nunique(dropna=True)
    if nunique <= max(20, int(len(series) * 0.05)):
        return "categorical"
    return "text"


def _column_stats(series: pd.Series, sample: pd.Series) -> dict[str, Any]:
    non_null = int(series.notna().sum())
    missing = int(series.isna().sum())
    dtype = str(series.dtype)
    semantic = _infer_semantic_type(series)
    stats: dict[str, Any] = {
        "name": str(series.name),
        "dtype": dtype,
        "semantic_type": semantic,
        "non_null_count": non_null,
        "missing_count": missing,
        "missing_pct": round(missing / max(len(series), 1) * 100, 3),
        "unique_count": int(series.nunique(dropna=True)),
    }

    if semantic == "numeric":
        numeric = pd.to_numeric(sample, errors="coerce").dropna()
        if len(numeric):
            desc = numeric.describe(percentiles=[0.25, 0.5, 0.75])
            stats["stats"] = {
                "mean": _json_safe(desc.get("mean")),
                "std": _json_safe(desc.get("std")),
                "min": _json_safe(desc.get("min")),
                "p25": _json_safe(desc.get("25%")),
                "p50": _json_safe(desc.get("50%")),
                "p75": _json_safe(desc.get("75%")),
                "max": _json_safe(desc.get("max")),
            }
            hist_counts, hist_edges = np.histogram(numeric.to_numpy(), bins=HISTOGRAM_BINS)
            stats["histogram"] = {
                "counts": [int(c) for c in hist_counts.tolist()],
                "edges": [_json_safe(float(e)) for e in hist_edges.tolist()],
            }
    elif semantic in {"categorical", "boolean", "text"}:
        value_counts = sample.astype("string").fillna("<NA>").value_counts().head(TOP_CATEGORIES)
        stats["top_values"] = [
            {"value": str(idx), "count": int(cnt)} for idx, cnt in value_counts.items()
        ]
    elif semantic == "datetime":
        dt = pd.to_datetime(sample, errors="coerce").dropna()
        if len(dt):
            stats["stats"] = {
                "min": _json_safe(dt.min()),
                "max": _json_safe(dt.max()),
            }

    return stats


def _correlation_matrix(df: pd.DataFrame) -> dict[str, Any] | None:
    numeric = df.select_dtypes(include=["number"])
    if numeric.shape[1] < 2:
        return None
    if numeric.shape[1] > MAX_CORR_COLUMNS:
        variances = numeric.var(numeric_only=True).sort_values(ascending=False)
        numeric = numeric[variances.head(MAX_CORR_COLUMNS).index]
    corr = numeric.corr(numeric_only=True).fillna(0.0)
    columns = [str(c) for c in corr.columns]
    matrix = [[_json_safe(float(v)) for v in row] for row in corr.to_numpy().tolist()]
    return {"columns": columns, "matrix": matrix}


def _target_candidates(columns: list[dict[str, Any]], row_count: int) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for col in columns:
        name = col["name"].lower()
        semantic = col["semantic_type"]
        unique = col["unique_count"]
        score = 0.0
        reasons: list[str] = []
        if any(k in name for k in ("target", "label", "class", "y_", "_y", "churn", "survived")):
            score += 0.5
            reasons.append("name_hint")
        if semantic == "boolean" or (semantic == "categorical" and 2 <= unique <= 20):
            score += 0.35
            reasons.append("classification_shape")
        if semantic == "numeric" and unique > max(20, int(row_count * 0.1)):
            score += 0.25
            reasons.append("regression_shape")
        if col["missing_pct"] > 40:
            score -= 0.2
            reasons.append("high_missing")
        if score >= 0.35:
            candidates.append(
                {
                    "column": col["name"],
                    "score": round(min(score, 1.0), 3),
                    "reasons": reasons,
                    "semantic_type": semantic,
                }
            )
    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates[:10]


def profile_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    """Return schema/profile/quality payloads ready for dataset_metadata persistence."""
    validation = validate_dataframe(df)
    if not validation.ok:
        raise ValueError("; ".join(validation.errors))

    sample = df if len(df) <= PROFILE_SAMPLE_ROWS else df.sample(PROFILE_SAMPLE_ROWS, random_state=42)
    columns = [_column_stats(df[col], sample[col]) for col in df.columns]

    duplicate_rows = int(df.duplicated().sum()) if len(df) <= PROFILE_SAMPLE_ROWS else int(
        sample.duplicated().sum()
    )
    missing_cells = int(df.isna().sum().sum())
    total_cells = max(int(df.shape[0] * df.shape[1]), 1)

    schema_json = {
        "columns": [
            {
                "name": c["name"],
                "dtype": c["dtype"],
                "semantic_type": c["semantic_type"],
            }
            for c in columns
        ]
    }

    profile_json = {
        "row_count": validation.row_count,
        "column_count": validation.column_count,
        "sampled_rows": int(len(sample)),
        "columns": columns,
        "correlation": _correlation_matrix(sample),
        "preview_columns": [str(c) for c in df.columns.tolist()],
    }

    quality_json = {
        "duplicate_row_count": duplicate_rows,
        "duplicate_row_pct": round(duplicate_rows / max(validation.row_count, 1) * 100, 3),
        "missing_cell_count": missing_cells,
        "missing_cell_pct": round(missing_cells / total_cells * 100, 3),
        "empty_column_count": sum(1 for c in columns if c["missing_pct"] >= 100),
        "warnings": validation.warnings,
        "ok": True,
    }

    return {
        "row_count": validation.row_count,
        "column_count": validation.column_count,
        "schema_json": schema_json,
        "profile_json": profile_json,
        "quality_json": quality_json,
        "target_candidates": _target_candidates(columns, validation.row_count),
        "semantic_summary": (
            f"{validation.row_count} rows × {validation.column_count} columns; "
            f"{quality_json['missing_cell_pct']}% missing cells; "
            f"{duplicate_rows} duplicate rows"
        ),
    }
