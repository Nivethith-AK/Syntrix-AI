"""LangGraph state schema for autonomous data intelligence workflows (CS-34 SDGP)."""

from __future__ import annotations

from typing import Any, TypedDict


class SyntrixGraphState(TypedDict, total=False):
    # Context
    workspace_id: str
    project_id: str
    user_id: str
    objective: str | None
    workflow_type: str
    dataset_version_id: str | None
    dataset_path: str | None
    dataframe: Any

    # State Machine Coordination & Observable Trace
    messages: list[str]
    activities: list[dict[str, Any]]
    plan: list[str]
    step_retries: dict[str, int]
    current_step: str

    # Structured Compute Artifacts (Data Intelligence Lifecycle)
    raw_profile: dict[str, Any]
    quality_report: dict[str, Any]
    quality_gate_passed: bool
    cleaning_summary: list[dict[str, Any]]
    eda: dict[str, Any]
    visualizations: dict[str, Any]
    report_md: str | None
    report_pdf_bytes: bytes | None

    # Control Flow & Human Feedback
    waiting_human: bool
    human_response: dict[str, Any] | None
    error: str | None
    result: dict[str, Any]

    # Backward Compatibility fields
    target_column: str | None
    task_type: str | None
    experiment: dict[str, Any]
    explanation: dict[str, Any]
