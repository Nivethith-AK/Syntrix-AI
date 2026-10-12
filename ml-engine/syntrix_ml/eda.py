"""Exploratory Data Analysis (EDA) compute module.

Deterministic computation powered by Pandas, NumPy, and SciPy.
Generates descriptive statistics, distributions, correlation summaries with p-values,
categorical associations, and evidence-grounded insights with explicit causality disclaimers.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

from syntrix_ml.profile import profile_dataframe

MAX_CHART_POINTS = 200
CAUSALITY_DISCLAIMER = (
    "Correlation does not imply causation. Observed association may be influenced by "
    "unobserved confounders, data collection artifacts, or sample selection bias."
)


def build_eda_insights(df: pd.DataFrame, *, profile: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build a comprehensive, deterministic EDA payload for reporting and visualization."""
    profile = profile or profile_dataframe(df)
    columns = profile["profile_json"]["columns"]
    numeric_cols = [c for c in columns if c["semantic_type"] == "numeric"]
    categorical_cols = [c for c in columns if c["semantic_type"] in {"categorical", "boolean"}]

    # 1. Chart-ready histograms
    histograms = []
    for col in numeric_cols[:12]:
        if "histogram" in col and col["histogram"].get("counts"):
            edges = col["histogram"]["edges"]
            counts = col["histogram"]["counts"]
            bins = []
            for i, count in enumerate(counts):
                label = f"{edges[i]:.2f} - {edges[i + 1]:.2f}" if i + 1 < len(edges) else str(edges[i])
                bins.append({"bin": label, "count": count})
            histograms.append({"column": col["name"], "bins": bins})

    # 2. Categorical frequencies
    categoricals = []
    for col in categorical_cols[:12]:
        top = col.get("top_values") or []
        categoricals.append(
            {
                "column": col["name"],
                "values": [{"label": str(v["value"]), "count": v["count"]} for v in top],
            }
        )

    # 3. Missingness rankings
    missingness = [
        {
            "column": c["name"],
            "missing_pct": c["missing_pct"],
            "missing_count": c.get("missing_count", 0),
        }
        for c in sorted(columns, key=lambda x: x["missing_pct"], reverse=True)
        if c["missing_pct"] > 0
    ][:25]

    # 4. Correlation Analysis (Pearson & Spearman with p-values)
    correlations = _compute_correlations(df, numeric_cols)

    # 5. Categorical Associations (Chi-square & Cramer's V)
    cat_associations = _compute_categorical_associations(df, categorical_cols)

    # 6. Group Comparisons (Categorical vs Numeric)
    group_comparisons = _compute_group_comparisons(df, categorical_cols, numeric_cols)

    # 7. Scatter Sample Points (Top correlated pair or first two numeric)
    scatter = _build_scatter_sample(df, numeric_cols, correlations)

    # 8. Evidence-grounded insights
    insights = _generate_evidence_insights(
        df=df,
        profile=profile,
        correlations=correlations,
        cat_associations=cat_associations,
        group_comparisons=group_comparisons,
    )

    return {
        "summary": {
            "row_count": profile["row_count"],
            "column_count": profile["column_count"],
            "semantic_summary": profile.get("semantic_summary"),
            "missing_cell_pct": profile["quality_json"].get("missing_cell_pct", 0.0),
            "duplicate_row_count": profile["quality_json"].get("duplicate_row_count", 0),
        },
        "insights": insights,
        "correlations": correlations,
        "categorical_associations": cat_associations,
        "group_comparisons": group_comparisons,
        "histograms": histograms,
        "categoricals": categoricals,
        "missingness": missingness,
        "scatter": scatter,
        "target_candidates": profile.get("target_candidates") or [],
        "column_summaries": [
            {
                "name": c["name"],
                "semantic_type": c["semantic_type"],
                "dtype": c["dtype"],
                "missing_pct": c["missing_pct"],
                "unique_count": c["unique_count"],
                "stats": c.get("stats"),
            }
            for c in columns
        ],
    }


def _compute_correlations(df: pd.DataFrame, numeric_cols: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute Pearson and Spearman correlation matrices with p-values."""
    col_names = [c["name"] for c in numeric_cols if c["name"] in df.columns]
    if len(col_names) < 2:
        return {"pairs": [], "matrix": {"columns": col_names, "values": []}}

    # Filter to numeric subframe
    sub_df = df[col_names].apply(pd.to_numeric, errors="coerce")
    pairs: list[dict[str, Any]] = []
    matrix_values: list[list[float | None]] = []

    for i, col_a in enumerate(col_names):
        row_vals: list[float | None] = []
        for j, col_b in enumerate(col_names):
            if i == j:
                row_vals.append(1.0)
                continue

            valid_mask = sub_df[col_a].notna() & sub_df[col_b].notna()
            valid_count = int(valid_mask.sum())

            if valid_count < 3:
                row_vals.append(None)
                continue

            series_a = sub_df.loc[valid_mask, col_a].to_numpy(dtype=float)
            series_b = sub_df.loc[valid_mask, col_b].to_numpy(dtype=float)

            # Check for non-zero variance
            if np.std(series_a) == 0 or np.std(series_b) == 0:
                row_vals.append(None)
                continue

            try:
                p_res = stats.pearsonr(series_a, series_b)
                pearson_r = float(p_res.statistic)
                pearson_p = float(p_res.pvalue)
            except Exception:
                pearson_r = None
                pearson_p = None

            try:
                s_res = stats.spearmanr(series_a, series_b)
                spearman_rho = float(s_res.statistic)
                spearman_p = float(s_res.pvalue)
            except Exception:
                spearman_rho = None
                spearman_p = None

            r_val = pearson_r if pearson_r is not None and not math.isnan(pearson_r) else None
            row_vals.append(r_val)

            # Record unique pairs once
            if i < j and r_val is not None:
                strength = _classify_correlation_strength(abs(r_val))
                pairs.append(
                    {
                        "feature_x": col_a,
                        "feature_y": col_b,
                        "pearson_r": round(r_val, 4),
                        "pearson_p_value": round(pearson_p, 5) if pearson_p is not None else None,
                        "spearman_rho": round(spearman_rho, 4) if spearman_rho is not None else None,
                        "spearman_p_value": round(spearman_p, 5) if spearman_p is not None else None,
                        "strength": strength,
                        "significant": bool(pearson_p is not None and pearson_p < 0.05),
                        "sample_size": valid_count,
                    }
                )
        matrix_values.append(row_vals)

    # Sort pairs by absolute pearson_r descending
    pairs.sort(key=lambda p: abs(p["pearson_r"]), reverse=True)

    return {
        "pairs": pairs,
        "matrix": {"columns": col_names, "values": matrix_values},
    }


def _classify_correlation_strength(abs_r: float) -> str:
    if abs_r >= 0.7:
        return "strong"
    if abs_r >= 0.4:
        return "moderate"
    if abs_r >= 0.2:
        return "weak"
    return "negligible"


def _compute_categorical_associations(
    df: pd.DataFrame, categorical_cols: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Compute Chi-square tests of independence and Cramer's V for categorical pairs."""
    results: list[dict[str, Any]] = []
    cat_names = [c["name"] for c in categorical_cols if c["name"] in df.columns][:6]

    for i in range(len(cat_names)):
        for j in range(i + 1, len(cat_names)):
            col_a, col_b = cat_names[i], cat_names[j]
            table = pd.crosstab(df[col_a], df[col_b])
            if table.size == 0 or table.shape[0] < 2 or table.shape[1] < 2:
                continue

            try:
                res = stats.chi2_contingency(table)
                chi2 = float(res.statistic)
                p_val = float(res.pvalue)
                dof = int(res.dof)
                n = int(table.to_numpy().sum())

                # Cramer's V calculation
                min_dim = min(table.shape[0] - 1, table.shape[1] - 1)
                cramers_v = float(np.sqrt(chi2 / (n * min_dim))) if (n > 0 and min_dim > 0) else 0.0

                results.append(
                    {
                        "feature_x": col_a,
                        "feature_y": col_b,
                        "chi2_statistic": round(chi2, 4),
                        "p_value": round(p_val, 5),
                        "degrees_of_freedom": dof,
                        "cramers_v": round(cramers_v, 4),
                        "sample_size": n,
                        "significant": bool(p_val < 0.05),
                    }
                )
            except Exception:
                continue

    results.sort(key=lambda r: r["cramers_v"], reverse=True)
    return results


def _compute_group_comparisons(
    df: pd.DataFrame,
    categorical_cols: list[dict[str, Any]],
    numeric_cols: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Compute deterministic numeric summaries grouped by categorical variables."""
    comparisons: list[dict[str, Any]] = []
    cat_names = [c["name"] for c in categorical_cols if c["name"] in df.columns][:4]
    num_names = [c["name"] for c in numeric_cols if c["name"] in df.columns][:4]

    for cat in cat_names:
        # Check cardinality: only analyze categorical with 2 to 10 distinct values
        unique_cnt = df[cat].nunique(dropna=True)
        if unique_cnt < 2 or unique_cnt > 10:
            continue

        for num in num_names:
            clean = df[[cat, num]].dropna()
            if len(clean) < 5:
                continue

            try:
                grouped = (
                    clean.groupby(cat)[num]
                    .agg(
                        count="count",
                        mean="mean",
                        std="std",
                        median="median",
                        min="min",
                        max="max",
                    )
                    .reset_index()
                )

                group_stats = []
                for _, row in grouped.iterrows():
                    group_stats.append(
                        {
                            "group": str(row[cat]),
                            "count": int(row["count"]),
                            "mean": round(float(row["mean"]), 3) if pd.notna(row["mean"]) else None,
                            "std": round(float(row["std"]), 3) if pd.notna(row["std"]) else None,
                            "median": round(float(row["median"]), 3) if pd.notna(row["median"]) else None,
                            "min": round(float(row["min"]), 3) if pd.notna(row["min"]) else None,
                            "max": round(float(row["max"]), 3) if pd.notna(row["max"]) else None,
                        }
                    )

                comparisons.append(
                    {
                        "categorical_feature": cat,
                        "numeric_feature": num,
                        "groups": group_stats,
                    }
                )
            except Exception:
                continue

    return comparisons


def _build_scatter_sample(
    df: pd.DataFrame,
    numeric_cols: list[dict[str, Any]],
    correlations: dict[str, Any],
) -> dict[str, Any] | None:
    """Sample points for bivariate scatter plotting."""
    pairs = correlations.get("pairs") or []
    if pairs:
        x_name = pairs[0]["feature_x"]
        y_name = pairs[0]["feature_y"]
    elif len(numeric_cols) >= 2:
        x_name = numeric_cols[0]["name"]
        y_name = numeric_cols[1]["name"]
    else:
        return None

    if x_name not in df.columns or y_name not in df.columns:
        return None

    sample = df[[x_name, y_name]].dropna()
    if len(sample) > MAX_CHART_POINTS:
        sample = sample.sample(MAX_CHART_POINTS, random_state=42)

    return {
        "x": x_name,
        "y": y_name,
        "points": [
            {"x": _safe_float(row[x_name]), "y": _safe_float(row[y_name])}
            for _, row in sample.iterrows()
        ],
    }


def _generate_evidence_insights(
    *,
    df: pd.DataFrame,
    profile: dict[str, Any],
    correlations: dict[str, Any],
    cat_associations: list[dict[str, Any]],
    group_comparisons: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Synthesize evidence-grounded insights strictly citing computed statistics."""
    insights: list[dict[str, Any]] = []
    quality = profile.get("quality_json") or {}

    # 1. Missingness & Quality Insights
    missing_pct = quality.get("missing_cell_pct", 0.0)
    if missing_pct > 5.0:
        insights.append(
            {
                "id": "insight_missingness",
                "severity": "warning",
                "category": "quality",
                "title": "Substantial Missing Data Detected",
                "detail": f"{missing_pct:.1f}% of total cells across the dataset are missing.",
                "evidence": {"missing_cell_pct": missing_pct},
                "causality_caveat": None,
            }
        )

    dup_count = quality.get("duplicate_row_count", 0)
    if dup_count > 0:
        insights.append(
            {
                "id": "insight_duplicates",
                "severity": "info",
                "category": "quality",
                "title": "Duplicate Records Identified",
                "detail": f"{dup_count} duplicate row(s) were identified.",
                "evidence": {"duplicate_row_count": dup_count},
                "causality_caveat": None,
            }
        )

    # 2. Strong Correlation Findings
    for pair in (correlations.get("pairs") or [])[:3]:
        if abs(pair["pearson_r"]) >= 0.4:
            direction = "positive" if pair["pearson_r"] > 0 else "negative"
            sig_text = (
                f"(p={pair['pearson_p_value']}, statistically significant at p < 0.05)"
                if pair.get("significant")
                else "(not statistically significant)"
            )
            insights.append(
                {
                    "id": f"insight_corr_{pair['feature_x']}_{pair['feature_y']}",
                    "severity": "info",
                    "category": "correlation",
                    "title": f"{pair['strength'].capitalize()} Correlation: {pair['feature_x']} & {pair['feature_y']}",
                    "detail": (
                        f"Features '{pair['feature_x']}' and '{pair['feature_y']}' exhibit a "
                        f"{pair['strength']} {direction} linear relationship with Pearson r = {pair['pearson_r']} {sig_text}."
                    ),
                    "evidence": {
                        "feature_x": pair["feature_x"],
                        "feature_y": pair["feature_y"],
                        "pearson_r": pair["pearson_r"],
                        "pearson_p_value": pair.get("pearson_p_value"),
                        "sample_size": pair.get("sample_size"),
                    },
                    "causality_caveat": CAUSALITY_DISCLAIMER,
                }
            )

    # 3. Categorical Associations (Chi-square)
    for assoc in cat_associations[:2]:
        if assoc.get("significant") and assoc["cramers_v"] >= 0.15:
            insights.append(
                {
                    "id": f"insight_assoc_{assoc['feature_x']}_{assoc['feature_y']}",
                    "severity": "info",
                    "category": "association",
                    "title": f"Categorical Association: {assoc['feature_x']} & {assoc['feature_y']}",
                    "detail": (
                        f"Chi-square test demonstrates a significant association between '{assoc['feature_x']}' "
                        f"and '{assoc['feature_y']}' (chi2 = {assoc['chi2_statistic']}, p = {assoc['p_value']}, "
                        f"Cramer's V = {assoc['cramers_v']})."
                    ),
                    "evidence": {
                        "feature_x": assoc["feature_x"],
                        "feature_y": assoc["feature_y"],
                        "cramers_v": assoc["cramers_v"],
                        "p_value": assoc["p_value"],
                    },
                    "causality_caveat": CAUSALITY_DISCLAIMER,
                }
            )

    # 4. Group Comparison Insights
    for comp in group_comparisons[:2]:
        groups = comp.get("groups") or []
        if len(groups) >= 2:
            sorted_groups = sorted([g for g in groups if g["mean"] is not None], key=lambda g: g["mean"])
            if len(sorted_groups) >= 2:
                low = sorted_groups[0]
                high = sorted_groups[-1]
                diff = round(high["mean"] - low["mean"], 2)
                insights.append(
                    {
                        "id": f"insight_group_{comp['categorical_feature']}_{comp['numeric_feature']}",
                        "severity": "info",
                        "category": "group_difference",
                        "title": f"Group Disparity in {comp['numeric_feature']} by {comp['categorical_feature']}",
                        "detail": (
                            f"Average '{comp['numeric_feature']}' ranges from {low['mean']} (group '{low['group']}') "
                            f"to {high['mean']} (group '{high['group']}'), representing a difference of {diff}."
                        ),
                        "evidence": {
                            "categorical_feature": comp["categorical_feature"],
                            "numeric_feature": comp["numeric_feature"],
                            "min_group": low["group"],
                            "min_mean": low["mean"],
                            "max_group": high["group"],
                            "max_mean": high["mean"],
                            "difference": diff,
                        },
                        "causality_caveat": CAUSALITY_DISCLAIMER,
                    }
                )

    # 5. Target Candidates if present
    targets = profile.get("target_candidates") or []
    if targets:
        top = targets[0]
        insights.append(
            {
                "id": "insight_target_candidate",
                "severity": "success",
                "category": "target",
                "title": f"Likely Objective Target: {top['column']}",
                "detail": f"Column '{top['column']}' exhibits target characteristics (recommended task: {top.get('task_type', 'analysis')}).",
                "evidence": {"column": top["column"], "task_type": top.get("task_type")},
                "causality_caveat": None,
            }
        )

    return insights


def _safe_float(value: Any) -> float | None:
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None
