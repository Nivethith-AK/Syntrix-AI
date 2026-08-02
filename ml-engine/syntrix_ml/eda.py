"""EDA v1 insights derived from a profiled DataFrame (no multi-agent graph)."""

from __future__ import annotations

from typing import Any

import pandas as pd

from syntrix_ml.profile import profile_dataframe

MAX_CHART_POINTS = 200


def build_eda_insights(df: pd.DataFrame, *, profile: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build chart-ready EDA payload for the interactive EDA page."""
    profile = profile or profile_dataframe(df)
    columns = profile["profile_json"]["columns"]
    numeric_cols = [c for c in columns if c["semantic_type"] == "numeric"]
    categorical_cols = [c for c in columns if c["semantic_type"] in {"categorical", "boolean"}]

    histograms = []
    for col in numeric_cols[:8]:
        if "histogram" in col:
            edges = col["histogram"]["edges"]
            counts = col["histogram"]["counts"]
            bins = []
            for i, count in enumerate(counts):
                label = f"{edges[i]}–{edges[i + 1]}" if i + 1 < len(edges) else str(edges[i])
                bins.append({"bin": label, "count": count})
            histograms.append({"column": col["name"], "bins": bins})

    categoricals = []
    for col in categorical_cols[:8]:
        top = col.get("top_values") or []
        categoricals.append(
            {
                "column": col["name"],
                "values": [{"label": v["value"], "count": v["count"]} for v in top],
            }
        )

    missingness = [
        {"column": c["name"], "missing_pct": c["missing_pct"]}
        for c in sorted(columns, key=lambda x: x["missing_pct"], reverse=True)
        if c["missing_pct"] > 0
    ][:25]

    scatter: dict[str, Any] | None = None
    if len(numeric_cols) >= 2:
        x_name, y_name = numeric_cols[0]["name"], numeric_cols[1]["name"]
        sample = df[[x_name, y_name]].dropna()
        if len(sample) > MAX_CHART_POINTS:
            sample = sample.sample(MAX_CHART_POINTS, random_state=42)
        scatter = {
            "x": x_name,
            "y": y_name,
            "points": [
                {"x": _safe_float(row[x_name]), "y": _safe_float(row[y_name])}
                for _, row in sample.iterrows()
            ],
        }

    insights: list[dict[str, str]] = []
    quality = profile["quality_json"]
    if quality["missing_cell_pct"] > 5:
        insights.append(
            {
                "severity": "warning",
                "title": "Missing values present",
                "detail": f"About {quality['missing_cell_pct']}% of cells are missing.",
            }
        )
    if quality["duplicate_row_count"] > 0:
        insights.append(
            {
                "severity": "info",
                "title": "Duplicate rows detected",
                "detail": f"{quality['duplicate_row_count']} duplicate row(s) found.",
            }
        )
    if numeric_cols:
        insights.append(
            {
                "severity": "info",
                "title": "Numeric features available",
                "detail": f"{len(numeric_cols)} numeric column(s) ready for modeling.",
            }
        )
    targets = profile.get("target_candidates") or []
    if targets:
        top = targets[0]
        insights.append(
            {
                "severity": "success",
                "title": "Likely target column",
                "detail": f"'{top['column']}' looks like a strong target candidate.",
            }
        )

    return {
        "summary": {
            "row_count": profile["row_count"],
            "column_count": profile["column_count"],
            "semantic_summary": profile.get("semantic_summary"),
            "missing_cell_pct": quality["missing_cell_pct"],
            "duplicate_row_count": quality["duplicate_row_count"],
        },
        "insights": insights,
        "histograms": histograms,
        "categoricals": categoricals,
        "missingness": missingness,
        "correlation": profile["profile_json"].get("correlation"),
        "scatter": scatter,
        "target_candidates": targets,
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


def _safe_float(value: Any) -> float | None:
    try:
        f = float(value)
        if f != f:  # NaN
            return None
        return f
    except (TypeError, ValueError):
        return None
