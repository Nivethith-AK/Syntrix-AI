"""Unit tests for the SDGP Deterministic Compute Pipeline.

Verifies:
- Data profiling & preparation (profile.py)
- Data quality validation & gating (validate.py)
- Exploratory data analysis with statistics & p-values (eda.py)
- Chart specs & Matplotlib image rendering (visualization.py)
- Evidence-grounded Markdown & PDF reporting (reporting.py)
"""

from __future__ import annotations

import pandas as pd
import pytest

from syntrix_ml.eda import build_eda_insights
from syntrix_ml.profile import prepare_and_clean_dataframe, profile_dataframe
from syntrix_ml.reporting import build_markdown_report, markdown_to_pdf
from syntrix_ml.validate import validate_dataframe_advanced
from syntrix_ml.visualization import build_visualization_specs, generate_chart_images


@pytest.fixture
def sample_business_df() -> pd.DataFrame:
    """Fixture mimicking a realistic business dataset (e.g. churn or customer transactions)."""
    return pd.DataFrame(
        {
            "customer_id": [f"CUST_{i}" for i in range(1, 21)] + ["CUST_1"],  # 1 duplicate
            "tenure_months": [1, 2, 5, 12, 24, 36, 48, 60, 72, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 1],
            "monthly_spend": [29.9, 35.0, 45.5, 60.0, 75.2, 89.0, 95.5, 110.0, 120.0, 40.0,
                              55.0, 65.0, 70.0, 80.0, 85.0, 90.0, 95.0, 100.0, 105.0, 115.0, 29.9],
            "contract_type": ["Month-to-month", "One year", "Two year", "Month-to-month", "Two year",
                              "One year", "Two year", "Two year", "Two year", "Month-to-month",
                              "Month-to-month", "One year", "Month-to-month", "Two year", "One year",
                              "Two year", "One year", "Two year", "Month-to-month", "Two year", "Month-to-month"],
            "churned": ["Yes", "No", "No", "Yes", "No", "No", "No", "No", "No", "Yes",
                        "Yes", "No", "Yes", "No", "No", "No", "No", "No", "Yes", "No", "Yes"],
            "optional_notes": [None, "VIP", None, "New", None, None, "Active", None, None, "Referral",
                               None, None, None, "Renewal", None, None, None, None, None, None, None],
        }
    )


def test_data_quality_validation(sample_business_df: pd.DataFrame) -> None:
    quality_report = validate_dataframe_advanced(sample_business_df)
    assert quality_report.row_count == 21
    assert quality_report.column_count == 6
    assert 0 <= quality_report.quality_score <= 100
    assert quality_report.duplicate_rows_count >= 1
    # Check that issues were detected (duplicate rows, high missingness in optional_notes)
    categories = [issue["category"] for issue in quality_report.issues]
    assert "duplicates" in categories
    assert "missingness" in categories


def test_data_preparation_and_cleaning(sample_business_df: pd.DataFrame) -> None:
    cleaned_df, actions = prepare_and_clean_dataframe(
        sample_business_df,
        deduplicate=True,
        impute_missing=True,
        strip_strings=True,
    )
    # The duplicate row should be removed
    assert len(cleaned_df) == 20
    assert isinstance(actions, list)
    assert len(actions) >= 1
    action_types = [a["action"] for a in actions]
    assert "remove_duplicate_records" in action_types


def test_eda_deterministic_computation(sample_business_df: pd.DataFrame) -> None:
    profile = profile_dataframe(sample_business_df)
    eda = build_eda_insights(sample_business_df, profile=profile)

    # Validate structure
    assert eda["summary"]["row_count"] == 21
    assert "correlations" in eda
    assert "categorical_associations" in eda
    assert "group_comparisons" in eda
    assert "insights" in eda

    # Check Pearson correlation between tenure and monthly spend
    pairs = eda["correlations"]["pairs"]
    assert len(pairs) >= 1
    top_pair = pairs[0]
    assert "pearson_r" in top_pair
    assert "pearson_p_value" in top_pair
    assert "strength" in top_pair
    assert top_pair["pearson_r"] > 0.8  # Strong positive correlation in synthetic data

    # Check that insights cite evidence and contain causality caveats where appropriate
    corr_insights = [i for i in eda["insights"] if i.get("category") == "correlation"]
    assert len(corr_insights) >= 1
    assert corr_insights[0]["causality_caveat"] is not None
    assert "Correlation does not imply causation" in corr_insights[0]["causality_caveat"]


def test_visualization_specs_and_images(sample_business_df: pd.DataFrame) -> None:
    profile = profile_dataframe(sample_business_df)
    eda = build_eda_insights(sample_business_df, profile=profile)

    # 1. Frontend JSON specs
    specs = build_visualization_specs(sample_business_df, eda)
    assert specs["total_charts"] >= 3
    chart_types = [s["chart_type"] for s in specs["specs"]]
    assert "bar" in chart_types
    assert "histogram" in chart_types

    # 2. Static PNG images for PDF embedding
    images = generate_chart_images(sample_business_df, eda)
    assert isinstance(images, dict)
    assert len(images) >= 2  # missingness, distributions, etc.
    for name, img_bytes in images.items():
        assert isinstance(img_bytes, bytes)
        assert len(img_bytes) > 500  # Valid PNG data


def test_reporting_markdown_and_pdf(sample_business_df: pd.DataFrame) -> None:
    quality_report = validate_dataframe_advanced(sample_business_df)
    cleaned_df, cleaning_summary = prepare_and_clean_dataframe(sample_business_df)
    profile = profile_dataframe(cleaned_df)
    eda = build_eda_insights(cleaned_df, profile=profile)
    chart_images = generate_chart_images(cleaned_df, eda)

    # 1. Build Markdown report
    md = build_markdown_report(
        title="Customer Churn Intelligence Report",
        objective="Analyze factors driving customer churn and retention.",
        quality_report=quality_report.to_dict(),
        cleaning_summary=cleaning_summary,
        eda=eda,
    )
    assert "# Customer Churn Intelligence Report" in md
    assert "Analytical Objective" in md
    assert "Data Quality Validation Gate" in md
    assert "Key Exploratory Findings" in md
    assert "Correlation does not demonstrate or prove causation" in md

    # 2. Render to PDF with embedded chart images
    pdf_bytes = markdown_to_pdf(
        md,
        title="Customer Churn Intelligence Report",
        chart_images=chart_images,
    )
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
