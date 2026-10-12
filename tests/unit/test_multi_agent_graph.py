"""Unit tests for the SDGP LangGraph Multi-Agent State Graph.

Verifies:
- Supervisor coordination and conditional routing
- Sequential execution: Profiling -> Quality Validation -> EDA -> Visualizations -> Reporting
- Enforcement of quality gate prior to exploratory analysis
- Bounded retry mechanics (max 3 retries)
- Observable activity traces
"""

from __future__ import annotations

import pandas as pd
import pytest

from syntrix_ai.graphs.workflow import build_workflow_graph
from syntrix_ai.state import SyntrixGraphState


@pytest.fixture
def test_dataset() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "id": list(range(1, 16)),
            "age": [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 22, 28, 38, 48, 58],
            "income": [30000, 40000, 52000, 61000, 75000, 85000, 92000, 105000, 110000, 125000, 28000, 39000, 59000, 72000, 88000],
            "category": ["A", "B", "A", "C", "B", "C", "A", "B", "C", "A", "A", "B", "C", "A", "B"],
        }
    )


def test_full_multi_agent_workflow_execution(test_dataset: pd.DataFrame) -> None:
    """Test full 5-stage agent execution via LangGraph."""
    graph = build_workflow_graph()

    initial_state: SyntrixGraphState = {
        "workspace_id": "ws-100",
        "project_id": "proj-100",
        "user_id": "user-100",
        "objective": "Understand income distribution by age and category",
        "workflow_type": "data_intelligence",
        "dataframe": test_dataset,  # direct in-memory injection
        "messages": [],
        "activities": [],
        "step_retries": {},
    }

    final_state = graph.invoke(initial_state)

    # 1. State machine completion checks
    assert "error" not in final_state or final_state["error"] is None
    messages = final_state.get("messages") or []
    assert "profiling_prep:complete" in messages
    assert "quality_validation:complete" in messages
    assert "exploratory_analysis:complete" in messages
    assert "visualization:complete" in messages
    assert "reporting:complete" in messages

    # 2. Check execution order (quality validation MUST precede exploratory analysis)
    prep_idx = messages.index("profiling_prep:complete")
    qual_idx = messages.index("quality_validation:complete")
    eda_idx = messages.index("exploratory_analysis:complete")
    viz_idx = messages.index("visualization:complete")
    rep_idx = messages.index("reporting:complete")

    assert prep_idx < qual_idx < eda_idx < viz_idx < rep_idx

    # 3. Check observable activities trace
    activities = final_state.get("activities") or []
    assert len(activities) >= 5
    agent_names = {a["agent_name"] for a in activities}
    assert "profiling_prep_agent" in agent_names
    assert "quality_validation_agent" in agent_names
    assert "exploratory_analysis_agent" in agent_names
    assert "visualization_agent" in agent_names
    assert "reporting_agent" in agent_names

    # 4. Check generated outputs
    assert final_state.get("quality_report") is not None
    assert final_state.get("quality_gate_passed") is True
    assert final_state.get("eda") is not None
    assert final_state.get("report_md") is not None
    assert "Data Intelligence Report" in final_state["report_md"]
    assert final_state.get("report_pdf_bytes") is not None
    assert final_state["report_pdf_bytes"].startswith(b"%PDF")


def test_bounded_retries_and_failure_handling() -> None:
    """Test that a workflow with missing data halts gracefully within bounded retries."""
    graph = build_workflow_graph()

    # Empty state with no dataset attached
    failing_state: SyntrixGraphState = {
        "workspace_id": "ws-err",
        "project_id": "proj-err",
        "user_id": "user-err",
        "objective": "Should fail gracefully",
        "workflow_type": "data_intelligence",
        "messages": [],
        "activities": [],
        "step_retries": {},
    }

    final_state = graph.invoke(failing_state)

    # Must record error after 3 attempts and stop
    assert final_state.get("error") is not None
    retries = final_state.get("step_retries") or {}
    assert retries.get("profiling_prep", 0) == 3
    # Downstream agents should NOT have executed
    messages = final_state.get("messages") or []
    assert "exploratory_analysis:complete" not in messages
    assert "reporting:complete" not in messages
