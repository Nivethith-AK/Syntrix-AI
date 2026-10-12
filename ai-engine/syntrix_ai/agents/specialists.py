"""Specialist agent nodes and supervisor routing (CS-34 SDGP).

Orchestrates the 5 specialized agent nodes:
1. Data Profiling & Preparation Agent
2. Data Quality Validation Agent
3. Exploratory Data Analysis (EDA) Agent
4. Visualization Agent
5. Reporting Agent

Enforces conditional routing (quality check before EDA; EDA before report),
bounded retries (max 3), and observable activity traces.
Model training and prediction are outside the project scope.
"""

from __future__ import annotations

import traceback
from typing import Any, Callable

import pandas as pd

from syntrix_ai.state import SyntrixGraphState
from syntrix_ml.eda import build_eda_insights
from syntrix_ml.profile import prepare_and_clean_dataframe, profile_dataframe
from syntrix_ml.reporting import build_markdown_report, markdown_to_pdf
from syntrix_ml.validate import check_data_quality
from syntrix_ml.visualization import build_visualization_specs, generate_chart_images

MAX_RETRIES = 3


def _record_activity(
    agent: str,
    activity_type: str,
    message: str,
    status: str = "succeeded",
    **payload: Any,
) -> dict[str, Any]:
    """Helper to append an observable execution trace event."""
    return {
        "agent_name": agent,
        "activity_type": activity_type,
        "status": status,
        "payload_json": {"message": message, **payload},
    }


def data_profiling_preparation_node(
    state: SyntrixGraphState,
    tools: dict[str, Callable] | None = None,
) -> SyntrixGraphState:
    """Agent 1: Profiles raw dataset and applies documented deterministic cleaning."""
    tools = tools or {}
    activities = list(state.get("activities") or [])
    retries = dict(state.get("step_retries") or {})
    node_name = "profiling_prep"

    try:
        df = _resolve_dataframe(state, tools)
        if df is None:
            raise ValueError("No dataset found in state or via tools.")

        # 1. Raw profiling
        raw_prof = profile_dataframe(df)

        # 2. Documented cleaning (deduplication, string trimming, missing imputation)
        cleaned_df, cleaning_actions = prepare_and_clean_dataframe(
            df, deduplicate=True, impute_missing=True, strip_strings=True
        )

        activities.append(
            _record_activity(
                "profiling_prep_agent",
                "profile_raw_data",
                f"Profiled {raw_prof['row_count']} rows and {raw_prof['column_count']} columns",
                row_count=raw_prof["row_count"],
                column_count=raw_prof["column_count"],
            )
        )
        activities.append(
            _record_activity(
                "profiling_prep_agent",
                "clean_and_prepare",
                f"Applied {len(cleaning_actions)} cleaning actions; {len(cleaned_df)} rows prepared",
                actions_count=len(cleaning_actions),
                final_rows=len(cleaned_df),
            )
        )

        # Store cleaned DataFrame in tools cache or state if possible
        if tools and "cache_dataframe" in tools:
            tools["cache_dataframe"](state.get("dataset_version_id"), cleaned_df)

        return {
            **state,
            "raw_profile": raw_prof,
            "cleaning_summary": cleaning_actions,
            "current_step": "quality_validation",
            "activities": activities,
            "dataframe": cleaned_df,
            "messages": list(state.get("messages") or []) + ["profiling_prep:complete"],
        }
    except Exception as exc:
        retries[node_name] = retries.get(node_name, 0) + 1
        activities.append(
            _record_activity(
                "profiling_prep_agent",
                "error",
                f"Profiling & preparation failed (attempt {retries[node_name]}/{MAX_RETRIES}): {exc}",
                status="failed",
            )
        )
        err = str(exc) if retries[node_name] >= MAX_RETRIES else None
        return {
            **state,
            "step_retries": retries,
            "error": err,
            "activities": activities,
            "messages": list(state.get("messages") or []) + [f"profiling_prep:failed:{retries[node_name]}"],
        }


def data_quality_validation_node(
    state: SyntrixGraphState,
    tools: dict[str, Callable] | None = None,
) -> SyntrixGraphState:
    """Agent 2: Validates data quality, scores health (0-100), and evaluates Quality Gate."""
    tools = tools or {}
    activities = list(state.get("activities") or [])
    retries = dict(state.get("step_retries") or {})
    node_name = "quality_validation"

    try:
        df = _resolve_dataframe(state, tools)
        if df is None:
            raise ValueError("No dataset available for quality validation.")

        quality_report = check_data_quality(df)
        gate_passed = quality_report.quality_gate_passed

        activities.append(
            _record_activity(
                "quality_validation_agent",
                "evaluate_quality_gate",
                f"Quality Score: {quality_report.quality_score:.1f}/100. Gate passed: {gate_passed}",
                quality_score=quality_report.quality_score,
                quality_gate_passed=gate_passed,
                issues_count=len(quality_report.issues),
            )
        )

        # Check for critical failure or human-in-the-loop requirement
        waiting_human = False
        if quality_report.quality_score < 20.0:
            waiting_human = True
            activities.append(
                _record_activity(
                    "quality_validation_agent",
                    "await_human",
                    "Quality score is severely degraded (<20). Awaiting user confirmation to proceed.",
                    status="waiting_human",
                )
            )

        return {
            **state,
            "quality_report": quality_report.to_dict(),
            "quality_gate_passed": gate_passed,
            "waiting_human": waiting_human,
            "current_step": "exploratory_analysis",
            "activities": activities,
            "messages": list(state.get("messages") or []) + ["quality_validation:complete"],
        }
    except Exception as exc:
        retries[node_name] = retries.get(node_name, 0) + 1
        activities.append(
            _record_activity(
                "quality_validation_agent",
                "error",
                f"Quality validation failed (attempt {retries[node_name]}/{MAX_RETRIES}): {exc}",
                status="failed",
            )
        )
        err = str(exc) if retries[node_name] >= MAX_RETRIES else None
        return {
            **state,
            "step_retries": retries,
            "error": err,
            "activities": activities,
            "messages": list(state.get("messages") or []) + [f"quality_validation:failed:{retries[node_name]}"],
        }


def exploratory_data_analysis_node(
    state: SyntrixGraphState,
    tools: dict[str, Callable] | None = None,
) -> SyntrixGraphState:
    """Agent 3: Computes distributions, correlations (with p-values), group comparisons, and insights."""
    tools = tools or {}
    activities = list(state.get("activities") or [])
    retries = dict(state.get("step_retries") or {})
    node_name = "exploratory_analysis"

    try:
        df = _resolve_dataframe(state, tools)
        if df is None:
            raise ValueError("No dataset available for EDA computation.")

        eda_payload = build_eda_insights(df)

        insights_cnt = len(eda_payload.get("insights") or [])
        corr_pairs_cnt = len((eda_payload.get("correlations") or {}).get("pairs") or [])

        activities.append(
            _record_activity(
                "exploratory_analysis_agent",
                "compute_eda_insights",
                f"Generated {insights_cnt} evidence-grounded insights and {corr_pairs_cnt} bivariate associations",
                insights_count=insights_cnt,
                correlation_pairs_count=corr_pairs_cnt,
            )
        )

        return {
            **state,
            "eda": eda_payload,
            "current_step": "visualization",
            "activities": activities,
            "messages": list(state.get("messages") or []) + ["exploratory_analysis:complete"],
        }
    except Exception as exc:
        retries[node_name] = retries.get(node_name, 0) + 1
        activities.append(
            _record_activity(
                "exploratory_analysis_agent",
                "error",
                f"EDA computation failed (attempt {retries[node_name]}/{MAX_RETRIES}): {exc}",
                status="failed",
            )
        )
        err = str(exc) if retries[node_name] >= MAX_RETRIES else None
        return {
            **state,
            "step_retries": retries,
            "error": err,
            "activities": activities,
            "messages": list(state.get("messages") or []) + [f"exploratory_analysis:failed:{retries[node_name]}"],
        }


def visualization_node(
    state: SyntrixGraphState,
    tools: dict[str, Callable] | None = None,
) -> SyntrixGraphState:
    """Agent 4: Generates structured frontend chart JSON specs and Matplotlib chart images for PDF."""
    tools = tools or {}
    activities = list(state.get("activities") or [])
    retries = dict(state.get("step_retries") or {})
    node_name = "visualization"

    try:
        df = _resolve_dataframe(state, tools)
        eda = state.get("eda") or {}
        if df is None:
            raise ValueError("No dataset available for visualization.")

        specs = build_visualization_specs(df, eda)
        images = generate_chart_images(df, eda)

        activities.append(
            _record_activity(
                "visualization_agent",
                "generate_visualizations",
                f"Constructed {specs['total_charts']} chart specifications and {len(images)} publication figures",
                total_charts=specs["total_charts"],
                figures_rendered=len(images),
            )
        )

        return {
            **state,
            "visualizations": {
                "specs": specs,
                "images": images,
            },
            "current_step": "reporting",
            "activities": activities,
            "messages": list(state.get("messages") or []) + ["visualization:complete"],
        }
    except Exception as exc:
        retries[node_name] = retries.get(node_name, 0) + 1
        activities.append(
            _record_activity(
                "visualization_agent",
                "error",
                f"Visualization failed (attempt {retries[node_name]}/{MAX_RETRIES}): {exc}",
                status="failed",
            )
        )
        err = str(exc) if retries[node_name] >= MAX_RETRIES else None
        return {
            **state,
            "step_retries": retries,
            "error": err,
            "activities": activities,
            "messages": list(state.get("messages") or []) + [f"visualization:failed:{retries[node_name]}"],
        }


def reporting_node(
    state: SyntrixGraphState,
    tools: dict[str, Callable] | None = None,
) -> SyntrixGraphState:
    """Agent 5: Compiles verified statistics, quality findings, EDA, and charts into Markdown and PDF."""
    tools = tools or {}
    activities = list(state.get("activities") or [])
    retries = dict(state.get("step_retries") or {})
    node_name = "reporting"

    try:
        objective = state.get("objective") or "Automated Dataset Intelligence Analysis"
        eda = state.get("eda") or {}
        quality_report = state.get("quality_report")
        cleaning_summary = state.get("cleaning_summary")
        visualizations = state.get("visualizations") or {}
        chart_images = visualizations.get("images")

        md_report = build_markdown_report(
            title=f"Data Intelligence Report: {objective}",
            objective=objective,
            quality_report=quality_report,
            cleaning_summary=cleaning_summary,
            eda=eda,
        )

        pdf_bytes = markdown_to_pdf(
            md_report,
            title="Syntrix AI Data Intelligence Report",
            chart_images=chart_images,
        )

        activities.append(
            _record_activity(
                "reporting_agent",
                "compile_reports",
                f"Compiled evidence-grounded report ({len(md_report.splitlines())} lines) and PDF document",
                markdown_lines=len(md_report.splitlines()),
                pdf_size_bytes=len(pdf_bytes),
            )
        )

        result_payload = {
            "objective": objective,
            "quality_report": quality_report,
            "quality_gate_passed": state.get("quality_gate_passed", True),
            "cleaning_actions": cleaning_summary,
            "eda_summary": eda.get("summary"),
            "insights": eda.get("insights"),
            "correlations": eda.get("correlations"),
            "chart_specs": visualizations.get("specs"),
            "report_md": md_report,
        }

        return {
            **state,
            "report_md": md_report,
            "report_pdf_bytes": pdf_bytes,
            "result": result_payload,
            "current_step": "end",
            "activities": activities,
            "messages": list(state.get("messages") or []) + ["reporting:complete"],
        }
    except Exception as exc:
        retries[node_name] = retries.get(node_name, 0) + 1
        activities.append(
            _record_activity(
                "reporting_agent",
                "error",
                f"Report compilation failed (attempt {retries[node_name]}/{MAX_RETRIES}): {exc}",
                status="failed",
            )
        )
        err = str(exc) if retries[node_name] >= MAX_RETRIES else None
        return {
            **state,
            "step_retries": retries,
            "error": err,
            "activities": activities,
            "messages": list(state.get("messages") or []) + [f"reporting:failed:{retries[node_name]}"],
        }


def supervisor_route(state: SyntrixGraphState) -> str:
    """Supervisor Agent conditional router enforcing state machine rules (CS-34 SDGP).

    Rules:
    1. If fatal error or retry count > 3, route to 'end'.
    2. If waiting on human approval, pause at 'end'.
    3. profiling_prep MUST run first.
    4. quality_validation MUST complete before exploratory_analysis.
    5. exploratory_analysis MUST complete before visualization.
    6. Validated analytical results & visualizations MUST exist before reporting.
    7. Once reporting completes, transition to 'end'.
    """
    if state.get("error"):
        return "end"

    if state.get("waiting_human") and not state.get("human_response"):
        return "end"

    msgs = state.get("messages") or []

    # Rule 1: Data Profiling & Prep
    if "profiling_prep:complete" not in msgs:
        retries = (state.get("step_retries") or {}).get("profiling_prep", 0)
        return "end" if retries >= MAX_RETRIES else "profiling_prep"

    # Rule 2: Quality Validation (MUST complete before EDA)
    if "quality_validation:complete" not in msgs:
        retries = (state.get("step_retries") or {}).get("quality_validation", 0)
        return "end" if retries >= MAX_RETRIES else "quality_validation"

    # Rule 3: Exploratory Data Analysis
    if "exploratory_analysis:complete" not in msgs:
        retries = (state.get("step_retries") or {}).get("exploratory_analysis", 0)
        return "end" if retries >= MAX_RETRIES else "exploratory_analysis"

    # Rule 4: Visualization
    if "visualization:complete" not in msgs:
        retries = (state.get("step_retries") or {}).get("visualization", 0)
        return "end" if retries >= MAX_RETRIES else "visualization"

    # Rule 5: Reporting
    if "reporting:complete" not in msgs:
        retries = (state.get("step_retries") or {}).get("reporting", 0)
        return "end" if retries >= MAX_RETRIES else "reporting"

    return "end"


def _resolve_dataframe(state: SyntrixGraphState, tools: dict[str, Callable]) -> pd.DataFrame | None:
    """Resolve DataFrame from state, tools cache, tools loader, or local path."""
    if "dataframe" in state and isinstance(state["dataframe"], pd.DataFrame):
        return state["dataframe"]

    if "get_dataframe" in tools:
        df = tools["get_dataframe"](state.get("dataset_version_id"))
        if df is not None:
            return df

    if "load_dataframe" in tools and state.get("dataset_version_id"):
        return tools["load_dataframe"](state["dataset_version_id"])

    dataset_path = state.get("dataset_path")
    if dataset_path:
        try:
            return pd.read_csv(dataset_path)
        except Exception:
            return None

    return None


# Backward-compatible aliases for any legacy imports
data_engineer_node = data_profiling_preparation_node
data_scientist_node = exploratory_data_analysis_node
ml_engineer_node = visualization_node
explainability_node = exploratory_data_analysis_node
report_node = reporting_node
