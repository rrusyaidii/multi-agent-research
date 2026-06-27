"""LangGraph StateGraph definition and compilation."""

from __future__ import annotations

from contextlib import AbstractContextManager
from pathlib import Path

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from research_agent.agents.analysis import analysis_node
from research_agent.agents.search import search_node
from research_agent.agents.writer import writer_node
from research_agent.config import get_settings
from research_agent.state import ResearchState
from research_agent.supervisor import route_from_supervisor, supervisor_node

_checkpointer: SqliteSaver | None = None
_checkpointer_cm: AbstractContextManager[SqliteSaver] | None = None


def _ensure_checkpointer_dir() -> Path:
    settings = get_settings()
    path = Path(settings.checkpointer_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _get_checkpointer() -> SqliteSaver:
    global _checkpointer, _checkpointer_cm

    if _checkpointer is None:
        checkpoint_dir = _ensure_checkpointer_dir()
        db_path = checkpoint_dir / "checkpoints.db"
        _checkpointer_cm = SqliteSaver.from_conn_string(str(db_path))
        _checkpointer = _checkpointer_cm.__enter__()

    return _checkpointer


def compile_graph(*, checkpointer: SqliteSaver | None = None):
    graph = StateGraph(ResearchState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("search", search_node)
    graph.add_node("analysis", analysis_node)
    graph.add_node("writer", writer_node)

    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "search": "search",
            "analysis": "analysis",
            "writer": "writer",
            "FINISH": END,
        },
    )
    graph.add_edge("search", "supervisor")
    graph.add_edge("analysis", "supervisor")
    graph.add_edge("writer", "supervisor")

    saver = checkpointer or _get_checkpointer()
    return graph.compile(checkpointer=saver)


def close_checkpointer() -> None:
    global _checkpointer, _checkpointer_cm

    if _checkpointer_cm is not None:
        _checkpointer_cm.__exit__(None, None, None)
        _checkpointer_cm = None
        _checkpointer = None
