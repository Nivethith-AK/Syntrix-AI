"""Pandas-based dataset profiling and data preparation engine (CS-34 SDGP)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

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
    stats_dict: dict[str, Any] = {
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
            
            skew_val = float(stats.skew(numeric)) if len(numeric) > 2 else 0.0
            kurt_val = float(stats.kurtosis(numeric)) if len(numeric) > 3 else 0.0
            
            stats_dict["stats"] = {
                "mean": _json_safe(round(float(desc.get("mean", 0)), 3)),
                "std": _json_safe(round(float(desc.get("std", 0)), 3)),
                "min": _json_safe(float(desc.get("min", 0))),
                "p25": _json_safe(float(desc.get("25%", 0))),
                "p50": _json_safe(float(desc.get("50%", 0))),
                "p75": _json_safe(float(desc.get("75%", 0))),
                "max": _json_safe(float(desc.get("max", 0))),
                "skewness": _json_safe(round(skew_val, 3)),
                "kurtosis": _json_safe(round(kurt_val, 3)),
            }
            hist_counts, hist_edges = np.histogram(numeric.to_numpy(), bins=HISTOGRAM_BINS)
            stats_dict["histogram"] = {
                "counts": [int(c) for c in hist_counts.tolist()],
                "edges": [_json_safe(float(e)) for e in hist_edges.tolist()],
            }
    elif semantic in {"categorical", "boolean", "text"}:
        value_counts = sample.astype("string").fillna("<NA>").value_counts().head(TOP_CATEGORIES)
        stats_dict["top_values"] = [
            {"value": str(idx), "count": int(cnt)} for idx, cnt in value_counts.items()
        ]
    elif semantic == "datetime":
        dt = pd.to_datetime(sample, errors="coerce").dropna()
        if len(dt):
            stats_dict["stats"] = {
                "min": _json_safe(dt.min()),
                "max": _json_safe(dt.max()),
            }

    return stats_dict


def _correlation_matrix(df: pd.DataFrame) -> dict[str, Any] | None:
    numeric = df.select_dtypes(include=["number"])
    if numeric.shape[1] < 2:
        return None
    if numeric.shape[1] > MAX_CORR_COLUMNS:
        variances = numeric.var(numeric_only=True).sort_values(ascending=False)
        numeric = numeric[variances.head(MAX_CORR_COLUMNS).index]
    corr = numeric.corr(numeric_only=True).fillna(0.0)
    columns = [str(c) for c in corr.columns]
    matrix = [[_json_safe(round(float(v), 3)) for v in row] for row in corr.to_numpy().tolist()]
    return {"columns": columns, "matrix": matrix}


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
        "semantic_summary": (
            f"{validation.row_count} rows × {validation.column_count} columns; "
            f"{quality_json['missing_cell_pct']}% missing cells; "
            f"{duplicate_rows} duplicate rows"
        ),
    }


def prepare_and_clean_dataframe(
    df: pd.DataFrame,
    *,
    deduplicate: bool = True,
    impute_missing: bool = True,
    strip_strings: bool = True,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """Data preparation and cleaning engine with documented cleaning steps (CS-34 SDGP).
    
    Returns:
    - cleaned_df: pandas DataFrame ready for exploratory data analysis
    - actions: user-visible list of applied transformations and affected rows
    """
    cleaned = df.copy()
    actions: list[dict[str, Any]] = []

    # 1. String trimming & empty string standardization
    if strip_strings:
        string_cols = cleaned.select_dtypes(include=["object", "string"]).columns
        trimmed_count = 0
        for col in string_cols:
            before_strip = cleaned[col].astype(str)
            cleaned[col] = cleaned[col].astype(str).str.strip()
            # Replace common null tokens
            null_mask = cleaned[col].str.lower().isin(["", "na", "n/a", "null", "none", "nan", "?"])
            if null_mask.any():
                cleaned.loc[null_mask, col] = np.nan
            changed = (before_strip != cleaned[col].fillna("")).sum()
            if changed > 0:
                trimmed_count += int(changed)
        if trimmed_count > 0:
            actions.append({
                "action": "trim_strings_and_null_tokens",
                "description": f"Standardized string whitespace and recognized {trimmed_count} null tokens across text fields",
                "affected_records": trimmed_count,
            })

    # 2. Duplicate removal
    if deduplicate:
        dup_count = int(cleaned.duplicated().sum())
        if dup_count > 0:
            cleaned = cleaned.drop_duplicates().reset_index(drop=True)
            actions.append({
                "action": "remove_duplicate_records",
                "description": f"Removed {dup_count} exact duplicate rows from dataset",
                "affected_records": dup_count,
            })

    # 3. Missing value imputation
    if impute_missing:
        imputed_cells = 0
        for col in cleaned.columns:
            null_count = int(cleaned[col].isna().sum())
            if 0 < null_count < len(cleaned):
                if pd.api.types.is_numeric_dtype(cleaned[col]):
                    median_val = cleaned[col].median()
                    cleaned[col] = cleaned[col].fillna(median_val)
                    actions.append({
                        "action": "impute_numeric_median",
                        "column": str(col),
                        "strategy": "median",
                        "imputed_value": _json_safe(median_val),
                        "affected_records": null_count,
                    })
                    imputed_cells += null_count
                elif pd.api.types.is_object_dtype(cleaned[col]) or pd.api.types.is_string_dtype(cleaned[col]):
                    mode_series = cleaned[col].mode(dropna=True)
                    fill_val = str(mode_series.iloc[0]) if len(mode_series) else "Unknown"
                    cleaned[col] = cleaned[col].fillna(fill_val)
                    actions.append({
                        "action": "impute_categorical_mode",
                        "column": str(col),
                        "strategy": "mode",
                        "imputed_value": fill_val,
                        "affected_records": null_count,
                    })
                    imputed_cells += null_count

    return cleaned, actions
