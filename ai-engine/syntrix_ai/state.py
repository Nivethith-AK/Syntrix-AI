"""LangGraph shared state schema (workspace-scoped)."""

from __future__ import annotations

from typing import Any, TypedDict


class SyntrixGraphState(TypedDict, total=False):
    workspace_id: str
    project_id: str
    user_id: str
    workflow_type: str
    dataset_version_id: str | None
    target_column: str | None
    task_type: str | None
    messages: list[str]
    activities: list[dict[str, Any]]
    eda: dict[str, Any]
    experiment: dict[str, Any]
    explanation: dict[str, Any]
    report_md: str | None
    waiting_human: bool
    human_response: dict[str, Any] | None
    error: str | None
    result: dict[str, Any]
