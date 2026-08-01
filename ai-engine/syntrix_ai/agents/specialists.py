"""Specialist agent node functions (deterministic + optional LLM narration)."""

from __future__ import annotations

from typing import Any, Callable

from syntrix_ai.state import SyntrixGraphState


def _activity(agent: str, activity_type: str, message: str, **payload: Any) -> dict[str, Any]:
    return {
        "agent_name": agent,
        "activity_type": activity_type,
        "status": "succeeded",
        "payload_json": {"message": message, **payload},
    }


def data_engineer_node(state: SyntrixGraphState, tools: dict[str, Callable]) -> SyntrixGraphState:
    version_id = state.get("dataset_version_id")
    activities = list(state.get("activities") or [])
    activities.append(
        _activity("data_engineer", "validate_dataset", f"Validated dataset version {version_id}")
    )
    eda = {}
    if version_id and "profile_dataset" in tools:
        eda = tools["profile_dataset"](version_id) or {}
        activities.append(
            _activity(
                "data_engineer",
                "profile",
                eda.get("semantic_summary") or "Profiled dataset",
                row_count=eda.get("row_count"),
            )
        )
    return {
        **state,
        "eda": eda,
        "activities": activities,
        "messages": list(state.get("messages") or []) + ["data_engineer:complete"],
    }


def data_scientist_node(state: SyntrixGraphState, tools: dict[str, Callable]) -> SyntrixGraphState:
    activities = list(state.get("activities") or [])
    eda = state.get("eda") or {}
    insights = (eda.get("eda") or eda).get("insights") if isinstance(eda, dict) else None
    if not insights and "build_eda" in tools and state.get("dataset_version_id"):
        eda = tools["build_eda"](state["dataset_version_id"]) or eda
        insights = eda.get("insights")
    activities.append(
        _activity(
            "data_scientist",
            "eda_insights",
            f"Generated {len(insights or [])} EDA insights",
        )
    )
    # HITL: if no target and automl, pause
    waiting = False
    if state.get("workflow_type") == "automl" and not state.get("target_column"):
        waiting = True
        activities.append(
            _activity(
                "data_scientist",
                "await_human",
                "Need target column selection before training",
                status_override="waiting_human",
            )
        )
    return {
        **state,
        "eda": eda,
        "activities": activities,
        "waiting_human": waiting,
        "messages": list(state.get("messages") or []) + ["data_scientist:complete"],
    }


def ml_engineer_node(state: SyntrixGraphState, tools: dict[str, Callable]) -> SyntrixGraphState:
    activities = list(state.get("activities") or [])
    experiment: dict[str, Any] = {}
    if state.get("waiting_human") and not state.get("human_response"):
        return state
    target = state.get("target_column") or (state.get("human_response") or {}).get("target_column")
    task_type = state.get("task_type") or (state.get("human_response") or {}).get("task_type") or "classification"
    if "train" in tools and state.get("dataset_version_id"):
        experiment = tools["train"](
            state["dataset_version_id"],
            target_column=target,
            task_type=task_type,
        ) or {}
        activities.append(
            _activity(
                "ml_engineer",
                "train",
                f"Trained models; best={experiment.get('best_algorithm')}",
                best_score=experiment.get("best_score"),
            )
        )
    return {
        **state,
        "target_column": target,
        "task_type": task_type,
        "experiment": experiment,
        "waiting_human": False,
        "activities": activities,
        "messages": list(state.get("messages") or []) + ["ml_engineer:complete"],
    }


def explainability_node(state: SyntrixGraphState, tools: dict[str, Callable]) -> SyntrixGraphState:
    activities = list(state.get("activities") or [])
    explanation: dict[str, Any] = {}
    if "explain" in tools:
        explanation = tools["explain"](state) or {}
        activities.append(
            _activity("explainability", "shap", "Computed model explanations", method=explanation.get("method"))
        )
    return {
        **state,
        "explanation": explanation,
        "activities": activities,
        "messages": list(state.get("messages") or []) + ["explainability:complete"],
    }


def report_node(state: SyntrixGraphState, tools: dict[str, Callable]) -> SyntrixGraphState:
    activities = list(state.get("activities") or [])
    report_md = None
    if "report" in tools:
        report_md = tools["report"](state)
        activities.append(_activity("report_agent", "generate_report", "Generated Markdown + PDF report"))
    return {
        **state,
        "report_md": report_md,
        "activities": activities,
        "result": {
            "eda": state.get("eda"),
            "experiment": state.get("experiment"),
            "explanation": state.get("explanation"),
            "report_md": report_md,
        },
        "messages": list(state.get("messages") or []) + ["report_agent:complete"],
    }


def supervisor_route(state: SyntrixGraphState) -> str:
    wf = (state.get("workflow_type") or "eda").lower()
    msgs = state.get("messages") or []
    if state.get("error"):
        return "end"
    if "data_engineer:complete" not in msgs:
        return "data_engineer"
    if "data_scientist:complete" not in msgs:
        return "data_scientist"
    if state.get("waiting_human") and not state.get("human_response"):
        return "end"
    if wf in {"automl", "explain", "report"} and "ml_engineer:complete" not in msgs:
        # explain/report may skip train if experiment already in state
        if wf == "explain" and state.get("experiment"):
            pass
        elif wf in {"automl", "report"} or not state.get("experiment"):
            if wf != "eda":
                return "ml_engineer"
    if wf in {"explain", "report", "automl"} and "explainability:complete" not in msgs:
        if wf in {"explain", "report"}:
            return "explainability"
    if wf in {"report", "automl"} and "report_agent:complete" not in msgs:
        if wf == "report" or (wf == "automl" and "ml_engineer:complete" in msgs):
            return "report_agent"
    if wf == "eda":
        return "end"
    return "end"
