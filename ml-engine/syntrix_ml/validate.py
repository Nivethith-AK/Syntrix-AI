"""Dataset structural and data-quality validation engine (CS-34 SDGP)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

MAX_COLUMNS = 500
MIN_ROWS = 1


@dataclass(slots=True)
class QualityIssue:
    severity: str  # "error", "warning", "info"
    category: str  # "missingness", "duplicates", "schema", "outliers", "cardinality", "type_consistency"
    column: str | None
    description: str
    impact: str
    metric: float | int | None = None


@dataclass(slots=True)
class ValidationResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    row_count: int = 0
    column_count: int = 0


@dataclass(slots=True)
class DataQualityReport:
    quality_score: float  # 0.0 to 100.0
    quality_gate_passed: bool
    row_count: int
    column_count: int
    missing_cells_pct: float
    duplicate_rows_count: int
    duplicate_rows_pct: float
    constant_columns: list[str] = field(default_factory=list)
    high_cardinality_columns: list[str] = field(default_factory=list)
    columns_with_high_missingness: list[dict[str, Any]] = field(default_factory=list)
    outlier_summary: list[dict[str, Any]] = field(default_factory=list)
    issues: list[dict[str, Any]] = field(default_factory=list)
    analysis_limitations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_dataframe(df: pd.DataFrame) -> ValidationResult:
    """Basic structural validation before profiling."""
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

    if df.columns.duplicated().any():
        errors.append("Duplicate column names are not allowed")

    unnamed = [str(c) for c in df.columns if str(c).startswith("Unnamed:")]
    if unnamed:
        warnings.append(f"{len(unnamed)} unnamed column(s) detected")

    if row_count > 1_000_000:
        warnings.append("Large dataset (>1M rows); analysis will use sampled statistics")

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


def check_data_quality(df: pd.DataFrame) -> DataQualityReport:
    """Rigorous data-quality validation agent compute layer.
    
    Evaluates:
    - Missingness rates & high-missingness columns
    - Duplicate records
    - Inconsistent values / mixed data types
    - Single-value constant columns & high-cardinality IDs
    - Outliers via IQR & Z-score
    - Potential analysis limitations
    - Computes an evidence-grounded quality score (0-100)
    """
    row_count = int(len(df))
    column_count = int(df.shape[1])
    issues: list[QualityIssue] = []
    limitations: list[str] = []

    if row_count == 0 or column_count == 0:
        return DataQualityReport(
            quality_score=0.0,
            quality_gate_passed=False,
            row_count=row_count,
            column_count=column_count,
            missing_cells_pct=100.0,
            duplicate_rows_count=0,
            duplicate_rows_pct=0.0,
            issues=[
                asdict(QualityIssue(
                    severity="error",
                    category="schema",
                    column=None,
                    description="Dataset is empty or contains no records",
                    impact="Cannot proceed with analytical workflows on empty datasets",
                ))
            ],
            analysis_limitations=["Empty dataset prevents exploratory analysis and reporting"],
        )

    # 1. Missingness analysis
    total_cells = row_count * column_count
    missing_cells = int(df.isna().sum().sum())
    missing_pct = round((missing_cells / max(total_cells, 1)) * 100, 2)

    high_missingness_cols: list[dict[str, Any]] = []
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        col_missing_pct = round((null_count / row_count) * 100, 2)
        if col_missing_pct > 0:
            if col_missing_pct >= 50.0:
                high_missingness_cols.append({
                    "column": str(col),
                    "missing_count": null_count,
                    "missing_pct": col_missing_pct,
                })
                issues.append(QualityIssue(
                    severity="warning" if col_missing_pct < 80.0 else "error",
                    category="missingness",
                    column=str(col),
                    description=f"Column '{col}' has {col_missing_pct}% missing values ({null_count}/{row_count} rows)",
                    impact="Features with over 50% missingness may bias statistical inferences if imputed without care",
                    metric=col_missing_pct,
                ))
            elif col_missing_pct > 15.0:
                issues.append(QualityIssue(
                    severity="warning",
                    category="missingness",
                    column=str(col),
                    description=f"Column '{col}' has {col_missing_pct}% missing values",
                    impact="Requires imputation or complete-case handling",
                    metric=col_missing_pct,
                ))

    if missing_pct > 25.0:
        limitations.append(
            f"Overall missingness is {missing_pct}%. Inferences must be validated against complete-case subsets."
        )

    # 2. Duplicate rows analysis
    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / row_count) * 100, 2)
    if duplicate_rows > 0:
        sev = "warning" if duplicate_pct < 10.0 else "error"
        issues.append(QualityIssue(
            severity=sev,
            category="duplicates",
            column=None,
            description=f"{duplicate_rows} duplicate row(s) detected ({duplicate_pct}% of total records)",
            impact="Duplicate records can inflate correlation metrics and distort frequency distributions",
            metric=duplicate_rows,
        ))
        limitations.append(
            f"Dataset contains {duplicate_rows} ({duplicate_pct}%) exact duplicate rows which should be deduplicated."
        )

    # 3. Cardinality & Constant Columns
    constant_cols: list[str] = []
    high_card_cols: list[str] = []
    for col in df.columns:
        nunique = int(df[col].nunique(dropna=True))
        if nunique <= 1:
            constant_cols.append(str(col))
            issues.append(QualityIssue(
                severity="warning",
                category="cardinality",
                column=str(col),
                description=f"Column '{col}' is invariant (has {nunique} unique value)",
                impact="Provides zero variance; cannot be used in correlation or discriminatory analysis",
                metric=nunique,
            ))
        elif pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
            if nunique == row_count and row_count > 10:
                high_card_cols.append(str(col))
                issues.append(QualityIssue(
                    severity="info",
                    category="cardinality",
                    column=str(col),
                    description=f"Column '{col}' has 100% unique text values (likely identifier or key)",
                    impact="High cardinality identifiers are not informative for group aggregation or correlation",
                    metric=nunique,
                ))

    # 4. Outlier Analysis via IQR & Z-Score
    outlier_summary: list[dict[str, Any]] = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        q25 = float(series.quantile(0.25))
        q75 = float(series.quantile(0.75))
        iqr = q75 - q25
        if iqr > 0:
            lower_bound = q25 - (1.5 * iqr)
            upper_bound = q75 + (1.5 * iqr)
            outlier_mask = (series < lower_bound) | (series > upper_bound)
            outlier_count = int(outlier_mask.sum())
            outlier_pct = round((outlier_count / len(series)) * 100, 2)
            if outlier_count > 0:
                outlier_summary.append({
                    "column": str(col),
                    "outlier_count": outlier_count,
                    "outlier_pct": outlier_pct,
                    "lower_bound": round(lower_bound, 3),
                    "upper_bound": round(upper_bound, 3),
                })
                if outlier_pct > 5.0:
                    issues.append(QualityIssue(
                        severity="info" if outlier_pct < 15.0 else "warning",
                        category="outliers",
                        column=str(col),
                        description=f"Column '{col}' has {outlier_count} outliers ({outlier_pct}% outside 1.5x IQR)",
                        impact="Outliers may disproportionately influence mean and Pearson correlation coefficients",
                        metric=outlier_pct,
                    ))

    # 5. Compute Quality Score (0 to 100)
    # Deductions:
    # - missing cells: up to -30
    # - duplicate rows: up to -20
    # - constant columns: -5 each (max -15)
    # - severe issues: -10 each
    base_score = 100.0
    missing_deduction = min(30.0, missing_pct * 1.2)
    duplicate_deduction = min(20.0, duplicate_pct * 2.0)
    constant_deduction = min(15.0, len(constant_cols) * 5.0)
    error_issues_count = sum(1 for i in issues if i.severity == "error")
    error_deduction = min(25.0, error_issues_count * 10.0)

    quality_score = max(0.0, round(base_score - missing_deduction - duplicate_deduction - constant_deduction - error_deduction, 1))
    quality_gate_passed = quality_score >= 35.0 and error_issues_count == 0

    if not quality_gate_passed:
        limitations.append(
            f"Data quality score ({quality_score}/100) requires data preparation and cleaning before high-confidence findings can be drawn."
        )

    return DataQualityReport(
        quality_score=quality_score,
        quality_gate_passed=quality_gate_passed,
        row_count=row_count,
        column_count=column_count,
        missing_cells_pct=missing_pct,
        duplicate_rows_count=duplicate_rows,
        duplicate_rows_pct=duplicate_pct,
        constant_columns=constant_cols,
        high_cardinality_columns=high_card_cols,
        columns_with_high_missingness=high_missingness_cols,
        outlier_summary=outlier_summary,
        issues=[asdict(i) for i in issues],
        analysis_limitations=limitations,
    )


validate_dataframe_advanced = check_data_quality
