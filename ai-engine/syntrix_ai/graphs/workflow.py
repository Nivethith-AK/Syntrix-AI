"""LangGraph supervisor workflow with optional Postgres checkpointer (CS-34 SDGP).

Coordinates the 5 specialized agent nodes:
1. Data Profiling & Preparation
2. Data Quality Validation (Quality Gate check)
3. Exploratory Data Analysis
4. Visualization Generation
5. Evidence-Grounded Reporting
"""

from __future__ import annotations

from functools import partial
from typing import Any, Callable

from syntrix_ai.agents.specialists import (
    data_profiling_preparation_node,
    data_quality_validation_node,
    exploratory_data_analysis_node,
    reporting_node,
    supervisor_route,
    visualization_node,
)
from syntrix_ai.state import SyntrixGraphState


def build_workflow_graph(tools: dict[str, Callable] | None = None, checkpointer: Any | None = None):
    """Compile a LangGraph StateGraph coordinating the 5 specialized data agents."""
    tools = tools or {}
    try:
        from langgraph.graph import END, StateGraph
    except Exception:
        return _FallbackGraph(tools)

    graph = StateGraph(SyntrixGraphState)

    # 1. Register specialized agent nodes
    graph.add_node("profiling_prep", partial(data_profiling_preparation_node, tools=tools))
    graph.add_node("quality_validation", partial(data_quality_validation_node, tools=tools))
    graph.add_node("exploratory_analysis", partial(exploratory_data_analysis_node, tools=tools))
    graph.add_node("visualization", partial(visualization_node, tools=tools))
    graph.add_node("reporting", partial(reporting_node, tools=tools))

    # 2. Set entry point to Data Profiling & Preparation
    graph.set_entry_point("profiling_prep")

    # 3. Add supervisor conditional routing edges
    route_targets = {
        "profiling_prep": "profiling_prep",
        "quality_validation": "quality_validation",
        "exploratory_analysis": "exploratory_analysis",
        "visualization": "visualization",
        "reporting": "reporting",
        "end": END,
    }

    graph.add_conditional_edges("profiling_prep", supervisor_route, route_targets)
    graph.add_conditional_edges("quality_validation", supervisor_route, route_targets)
    graph.add_conditional_edges("exploratory_analysis", supervisor_route, route_targets)
    graph.add_conditional_edges("visualization", supervisor_route, route_targets)
    graph.add_conditional_edges("reporting", supervisor_route, route_targets)

    if checkpointer is not None:
        return graph.compile(checkpointer=checkpointer)
    return graph.compile()


def get_postgres_checkpointer(database_url: str):
    """Create LangGraph Postgres checkpointer."""
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from psycopg_pool import ConnectionPool
    except Exception:
        return None

    url = database_url
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)

    try:
        pool = ConnectionPool(conninfo=url, max_size=5, kwargs={"autocommit": True})
        saver = PostgresSaver(pool)
        saver.setup()
        return saver
    except Exception:
        return None


class _FallbackGraph:
    """Deterministic linear fallback runner when LangGraph is not available."""

    def __init__(self, tools: dict[str, Callable]) -> None:
        self.tools = tools

    def invoke(self, state: dict[str, Any], config: dict | None = None) -> dict[str, Any]:
        current: SyntrixGraphState = dict(state)  # type: ignore[assignment]
        for _ in range(15):
            nxt = supervisor_route(current)
            if nxt == "end":
                break
            if nxt == "profiling_prep":
                current = data_profiling_preparation_node(current, self.tools)
            elif nxt == "quality_validation":
                current = data_quality_validation_node(current, self.tools)
            elif nxt == "exploratory_analysis":
                current = exploratory_data_analysis_node(current, self.tools)
            elif nxt == "visualization":
                current = visualization_node(current, self.tools)
            elif nxt == "reporting":
                current = reporting_node(current, self.tools)
            else:
                break
        return dict(current)
