"""End-to-End integration test for CS-34 SDGP Multi-Agent Data Intelligence Platform.

Runs the complete workflow on `samples/demo_churn.csv`:
- Data ingestion from CSV
- Data profiling & preparation (trimming, deduplication, imputation)
- Data-quality validation & Quality Gate evaluation
- Exploratory data analysis (correlations with p-values, Chi-square, group comparisons)
- Visualization generation (frontend JSON specs + Matplotlib PNG publication images)
- Evidence-grounded reporting (Markdown + PDF with embedded charts & causality boundary)
- Observable trace event broadcasting
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from app.core.events import EventBroadcaster
from syntrix_ai.graphs.workflow import build_workflow_graph
from syntrix_ai.state import SyntrixGraphState


def test_sdgp_end_to_end_churn_analysis() -> None:
    csv_path = Path("samples/demo_churn.csv")
    assert csv_path.exists(), "demo_churn.csv fixture must exist"

    df = pd.read_csv(csv_path)
    assert len(df) == 25
    assert "churned" in df.columns

    # Setup isolated event broadcaster to monitor observable execution traces
    test_broadcaster = EventBroadcaster()
    run_channel = "test-run-churn-001"

    # Compile the LangGraph supervisor workflow
    graph = build_workflow_graph()

    objective = "Identify primary risk factors for customer churn and evaluate cohort differences."

    initial_state: SyntrixGraphState = {
        "workspace_id": "ws-sdgp-e2e",
        "project_id": "proj-sdgp-e2e",
        "user_id": "user-evaluator",
        "objective": objective,
        "workflow_type": "data_intelligence",
        "dataframe": df,
        "messages": [],
        "activities": [],
        "step_retries": {},
    }

    # Execute end-to-end multi-agent workflow
    final_state = graph.invoke(initial_state)

    # 1. Verification of Workflow Completion
    assert final_state.get("error") is None
    messages = final_state.get("messages") or []
    assert "profiling_prep:complete" in messages
    assert "quality_validation:complete" in messages
    assert "exploratory_analysis:complete" in messages
    assert "visualization:complete" in messages
    assert "reporting:complete" in messages

    # 2. Verification of Data Quality Validation Gate
    quality_report = final_state.get("quality_report")
    assert quality_report is not None
    assert quality_report["quality_score"] > 50.0
    assert quality_report["quality_gate_passed"] is True
    assert quality_report["row_count"] == 25
    assert quality_report["column_count"] == 8

    # 3. Verification of Deterministic EDA & Evidence Grounding
    eda = final_state.get("eda")
    assert eda is not None
    assert "correlations" in eda
    pairs = eda["correlations"]["pairs"]
    assert len(pairs) >= 1

    # Tenure and total charges should show strong positive correlation
    tenure_total = next(
        (p for p in pairs if ("tenure_months" in (p["feature_x"], p["feature_y"]) and "total_charges" in (p["feature_x"], p["feature_y"]))),
        None,
    )
    assert tenure_total is not None
    assert tenure_total["pearson_r"] > 0.8
    assert tenure_total["pearson_p_value"] is not None
    assert tenure_total["significant"] is True

    # Check evidence-grounded insights contain causality disclaimers
    insights = eda.get("insights") or []
    assert len(insights) >= 2
    corr_insights = [i for i in insights if i.get("category") == "correlation"]
    if corr_insights:
        assert corr_insights[0]["causality_caveat"] is not None
        assert "Correlation does not imply causation" in corr_insights[0]["causality_caveat"]

    # 4. Verification of Visualizations
    visualizations = final_state.get("visualizations") or {}
    specs = visualizations.get("specs") or {}
    assert specs.get("total_charts", 0) >= 3

    images = visualizations.get("images") or {}
    assert len(images) >= 2  # e.g., missingness, correlation_heatmap, distributions, scatter
    for name, img_bytes in images.items():
        assert len(img_bytes) > 500

    # 5. Verification of Report Generation (Markdown + PDF)
    md_report = final_state.get("report_md")
    assert md_report is not None
    assert "# Data Intelligence Report:" in md_report
    assert objective in md_report
    assert "Data Quality Validation Gate" in md_report
    assert "Statistical Caveats & Causality Boundary" in md_report

    pdf_bytes = final_state.get("report_pdf_bytes")
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")

    # 6. Verification of Observable Activity Trace
    activities = final_state.get("activities") or []
    assert len(activities) >= 5
    for act in activities:
        assert "payload_json" in act
        assert "agent_name" in act
        # Ensure no private LLM prompts in activities
        assert "system_prompt" not in act["payload_json"]
        assert "chain_of_thought" not in act["payload_json"]
