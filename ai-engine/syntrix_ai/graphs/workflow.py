"""LangGraph supervisor workflow with optional Postgres checkpointer."""

from __future__ import annotations

from functools import partial
from typing import Any, Callable

from syntrix_ai.agents.specialists import (
    data_engineer_node,
    data_scientist_node,
    explainability_node,
    ml_engineer_node,
    report_node,
    supervisor_route,
)
from syntrix_ai.state import SyntrixGraphState


def build_workflow_graph(tools: dict[str, Callable], checkpointer: Any | None = None):
    """Compile a LangGraph StateGraph. Falls back to a linear runner if langgraph missing."""
    try:
        from langgraph.graph import END, StateGraph
    except Exception:  # noqa: BLE001
        return _FallbackGraph(tools)

    graph = StateGraph(SyntrixGraphState)
    graph.add_node("data_engineer", partial(data_engineer_node, tools=tools))
    graph.add_node("data_scientist", partial(data_scientist_node, tools=tools))
    graph.add_node("ml_engineer", partial(ml_engineer_node, tools=tools))
    graph.add_node("explainability", partial(explainability_node, tools=tools))
    graph.add_node("report_agent", partial(report_node, tools=tools))

    graph.set_entry_point("data_engineer")
    graph.add_conditional_edges(
        "data_engineer",
        supervisor_route,
        {
            "data_scientist": "data_scientist",
            "ml_engineer": "ml_engineer",
            "explainability": "explainability",
            "report_agent": "report_agent",
            "end": END,
            "data_engineer": "data_engineer",
        },
    )
    for node in ("data_scientist", "ml_engineer", "explainability", "report_agent"):
        graph.add_conditional_edges(
            node,
            supervisor_route,
            {
                "data_engineer": "data_engineer",
                "data_scientist": "data_scientist",
                "ml_engineer": "ml_engineer",
                "explainability": "explainability",
                "report_agent": "report_agent",
                "end": END,
            },
        )

    if checkpointer is not None:
        return graph.compile(checkpointer=checkpointer)
    return graph.compile()


def get_postgres_checkpointer(database_url: str):
    """Create LangGraph Postgres checkpointer (Postgres, not Redis)."""
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from psycopg_pool import ConnectionPool
    except Exception:  # noqa: BLE001
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
    except Exception:  # noqa: BLE001
        return None


class _FallbackGraph:
    """Linear orchestration when LangGraph cannot be imported/compiled."""

    def __init__(self, tools: dict[str, Callable]) -> None:
        self.tools = tools

    def invoke(self, state: dict[str, Any], config: dict | None = None) -> dict[str, Any]:
        current: SyntrixGraphState = dict(state)  # type: ignore[assignment]
        for _ in range(12):
            nxt = supervisor_route(current)
            if nxt == "end":
                break
            if nxt == "data_engineer":
                current = data_engineer_node(current, self.tools)
            elif nxt == "data_scientist":
                current = data_scientist_node(current, self.tools)
            elif nxt == "ml_engineer":
                current = ml_engineer_node(current, self.tools)
            elif nxt == "explainability":
                current = explainability_node(current, self.tools)
            elif nxt == "report_agent":
                current = report_node(current, self.tools)
            else:
                break
        return dict(current)
