"""Deterministic visualization generator.

Generates:
1. Structured JSON chart specs for frontend rendering (Recharts / Chart.js).
2. Clean static PNG chart images via Matplotlib for embedding into PDF reports.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def build_visualization_specs(df: pd.DataFrame, eda: dict[str, Any]) -> dict[str, Any]:
    """Generate structured chart specifications for frontend dashboards and widgets."""
    specs: list[dict[str, Any]] = []

    # 1. Missingness Bar Chart Spec
    missingness = eda.get("missingness") or []
    if missingness:
        specs.append(
            {
                "id": "chart_missingness",
                "chart_type": "bar",
                "title": "Missing Values by Column (%)",
                "x_axis": "column",
                "y_axis": "missing_pct",
                "data": [
                    {"column": m["column"], "missing_pct": round(m["missing_pct"], 2)}
                    for m in missingness[:10]
                ],
            }
        )

    # 2. Numeric Distribution Histograms Specs
    histograms = eda.get("histograms") or []
    for h in histograms[:4]:
        specs.append(
            {
                "id": f"chart_hist_{h['column']}",
                "chart_type": "histogram",
                "title": f"Distribution of {h['column']}",
                "x_axis": "bin",
                "y_axis": "count",
                "column": h["column"],
                "data": h.get("bins", []),
            }
        )

    # 3. Categorical Breakdown Bar Specs
    categoricals = eda.get("categoricals") or []
    for c in categoricals[:4]:
        specs.append(
            {
                "id": f"chart_cat_{c['column']}",
                "chart_type": "bar",
                "title": f"Top Categories: {c['column']}",
                "x_axis": "label",
                "y_axis": "count",
                "column": c["column"],
                "data": c.get("values", [])[:8],
            }
        )

    # 4. Correlation Heatmap Spec
    correlations = eda.get("correlations") or {}
    matrix = correlations.get("matrix") or {}
    if matrix.get("columns") and matrix.get("values"):
        specs.append(
            {
                "id": "chart_correlation_heatmap",
                "chart_type": "heatmap",
                "title": "Pearson Correlation Heatmap",
                "columns": matrix["columns"],
                "matrix": matrix["values"],
            }
        )

    # 5. Scatter Plot Spec
    scatter = eda.get("scatter")
    if scatter and scatter.get("points"):
        specs.append(
            {
                "id": f"chart_scatter_{scatter['x']}_{scatter['y']}",
                "chart_type": "scatter",
                "title": f"Bivariate Relationship: {scatter['x']} vs {scatter['y']}",
                "x_axis": scatter["x"],
                "y_axis": scatter["y"],
                "data": scatter["points"],
            }
        )

    # 6. Group Comparisons Bar Specs
    group_comps = eda.get("group_comparisons") or []
    for comp in group_comps[:2]:
        specs.append(
            {
                "id": f"chart_group_{comp['categorical_feature']}_{comp['numeric_feature']}",
                "chart_type": "grouped_bar",
                "title": f"Mean {comp['numeric_feature']} by {comp['categorical_feature']}",
                "x_axis": "group",
                "y_axis": "mean",
                "data": [
                    {"group": g["group"], "mean": g["mean"], "count": g["count"]}
                    for g in comp.get("groups", [])
                ],
            }
        )

    return {
        "total_charts": len(specs),
        "specs": specs,
    }


def generate_chart_images(
    df: pd.DataFrame,
    eda: dict[str, Any],
    *,
    output_dir: Path | str | None = None,
) -> dict[str, bytes]:
    """Generate static PNG chart images using Matplotlib for PDF reporting.

    Returns a dict mapping chart_id to raw PNG bytes.
    If output_dir is specified, also saves images to disk.
    """
    images: dict[str, bytes] = {}
    out_path = Path(output_dir) if output_dir else None
    if out_path:
        out_path.mkdir(parents=True, exist_ok=True)

    # Style configuration for clean, professional reports
    plt.rcParams["font.sans-serif"] = ["Helvetica", "Arial", "DejaVu Sans"]
    plt.rcParams["axes.edgecolor"] = "#CCCCCC"
    plt.rcParams["axes.linewidth"] = 0.8

    # 1. Missingness Chart Image
    missingness = eda.get("missingness") or []
    if missingness:
        try:
            fig, ax = plt.subplots(figsize=(6, 3), dpi=150)
            cols = [m["column"] for m in missingness[:8]][::-1]
            pcts = [m["missing_pct"] for m in missingness[:8]][::-1]
            bars = ax.barh(cols, pcts, color="#EF4444", height=0.55)
            ax.set_xlabel("Missing Percentage (%)", fontsize=8, color="#374151")
            ax.set_title("Missing Values by Feature", fontsize=9, fontweight="bold", color="#111827")
            ax.tick_params(axis="both", labelsize=8)
            ax.grid(axis="x", linestyle="--", alpha=0.3)
            ax.set_xlim(0, max(max(pcts) * 1.15, 10.0))
            for bar in bars:
                w = bar.get_width()
                ax.text(w + 0.5, bar.get_y() + bar.get_height() / 2, f"{w:.1f}%", va="center", fontsize=7)
            plt.tight_layout()
            img_bytes = _fig_to_bytes(fig)
            images["missingness"] = img_bytes
            if out_path:
                (out_path / "chart_missingness.png").write_bytes(img_bytes)
        except Exception:
            pass
        finally:
            plt.close("all")

    # 2. Correlation Matrix Heatmap Image
    correlations = eda.get("correlations") or {}
    matrix_info = correlations.get("matrix") or {}
    cols = matrix_info.get("columns") or []
    values = matrix_info.get("values") or []
    if len(cols) >= 2 and len(values) >= 2:
        try:
            num_matrix = np.array(
                [[v if v is not None else np.nan for v in row] for row in values],
                dtype=float,
            )
            fig, ax = plt.subplots(figsize=(5.5, 4.5), dpi=150)
            cax = ax.matshow(num_matrix, cmap="coolwarm", vmin=-1, vmax=1)
            fig.colorbar(cax, fraction=0.046, pad=0.04)
            ax.set_xticks(range(len(cols)))
            ax.set_yticks(range(len(cols)))
            ax.set_xticklabels(cols, rotation=45, ha="left", fontsize=7)
            ax.set_yticklabels(cols, fontsize=7)
            ax.set_title("Correlation Matrix (Pearson r)", fontsize=9, fontweight="bold", pad=20)
            for i in range(len(cols)):
                for j in range(len(cols)):
                    val = num_matrix[i, j]
                    if not np.isnan(val):
                        ax.text(
                            j,
                            i,
                            f"{val:.2f}",
                            ha="center",
                            va="center",
                            fontsize=6.5,
                            color="white" if abs(val) > 0.5 else "black",
                        )
            plt.tight_layout()
            img_bytes = _fig_to_bytes(fig)
            images["correlation_heatmap"] = img_bytes
            if out_path:
                (out_path / "chart_correlation.png").write_bytes(img_bytes)
        except Exception:
            pass
        finally:
            plt.close("all")

    # 3. Numeric Distributions (Histogram grid for up to 4 features)
    histograms = eda.get("histograms") or []
    if histograms:
        try:
            n_charts = min(len(histograms), 4)
            fig, axes = plt.subplots(
                1, n_charts, figsize=(3.2 * n_charts, 2.8), dpi=150, squeeze=False
            )
            for idx, h in enumerate(histograms[:n_charts]):
                ax = axes[0, idx]
                bins = h.get("bins") or []
                if bins:
                    counts = [b["count"] for b in bins]
                    labels = [b["bin"].split("-")[0].strip() for b in bins]
                    ax.bar(range(len(counts)), counts, color="#3B82F6", edgecolor="white", width=0.85)
                    ax.set_title(h["column"], fontsize=8, fontweight="bold")
                    ax.set_xticks(range(0, len(labels), max(1, len(labels) // 4)))
                    ax.set_xticklabels(labels[:: max(1, len(labels) // 4)], rotation=30, fontsize=6.5)
                    ax.tick_params(axis="y", labelsize=7)
                    ax.grid(axis="y", linestyle="--", alpha=0.3)
            plt.suptitle("Feature Distributions", fontsize=9, fontweight="bold", y=1.02)
            plt.tight_layout()
            img_bytes = _fig_to_bytes(fig)
            images["distributions"] = img_bytes
            if out_path:
                (out_path / "chart_distributions.png").write_bytes(img_bytes)
        except Exception:
            pass
        finally:
            plt.close("all")

    # 4. Scatter Plot Image
    scatter = eda.get("scatter")
    if scatter and scatter.get("points"):
        try:
            fig, ax = plt.subplots(figsize=(5, 3.2), dpi=150)
            xs = [p["x"] for p in scatter["points"] if p["x"] is not None and p["y"] is not None]
            ys = [p["y"] for p in scatter["points"] if p["x"] is not None and p["y"] is not None]
            if len(xs) > 3:
                ax.scatter(xs, ys, alpha=0.5, color="#6366F1", edgecolors="none", s=22)
                # Trendline
                m, b = np.polyfit(xs, ys, 1)
                x_trend = np.linspace(min(xs), max(xs), 50)
                ax.plot(x_trend, m * x_trend + b, color="#DC2626", linestyle="--", linewidth=1.2, label="Trendline")
                ax.legend(fontsize=7, loc="best")
            ax.set_xlabel(scatter["x"], fontsize=8)
            ax.set_ylabel(scatter["y"], fontsize=8)
            ax.set_title(f"{scatter['x']} vs {scatter['y']}", fontsize=9, fontweight="bold")
            ax.tick_params(axis="both", labelsize=7.5)
            ax.grid(linestyle="--", alpha=0.3)
            plt.tight_layout()
            img_bytes = _fig_to_bytes(fig)
            images["scatter"] = img_bytes
            if out_path:
                (out_path / "chart_scatter.png").write_bytes(img_bytes)
        except Exception:
            pass
        finally:
            plt.close("all")

    return images


def _fig_to_bytes(fig: matplotlib.figure.Figure) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    return buf.getvalue()
