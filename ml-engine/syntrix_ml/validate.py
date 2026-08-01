"""Dataset validation before profiling."""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

MAX_COLUMNS = 500
MIN_ROWS = 1


@dataclass(slots=True)
class ValidationResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    row_count: int = 0
    column_count: int = 0


def validate_dataframe(df: pd.DataFrame) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []

    if df is None or not isinstance(df, pd.DataFrame):
        return ValidationResult(ok=False, errors=["Input is not a tabular DataFrame"])

    row_count = int(len(df))
    column_count = int(df.shape[1])

    if column_count == 0:
        errors.append("Dataset has no columns")
    if row_count < MIN_ROWS:
        errors.append("Dataset has no rows")
    if column_count > MAX_COLUMNS:
        errors.append(f"Too many columns ({column_count}); max is {MAX_COLUMNS}")

    # Duplicate column names break clean profiling
    if df.columns.duplicated().any():
        errors.append("Duplicate column names are not allowed")

    unnamed = [str(c) for c in df.columns if str(c).startswith("Unnamed:")]
    if unnamed:
        warnings.append(f"{len(unnamed)} unnamed column(s) detected")

    if row_count > 1_000_000:
        warnings.append("Large dataset (>1M rows); profiling uses sampled statistics")

    empty_cols = [str(c) for c in df.columns if df[c].isna().all()]
    if empty_cols:
        warnings.append(f"{len(empty_cols)} entirely empty column(s)")

    return ValidationResult(
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        row_count=row_count,
        column_count=column_count,
    )
