"""Tests for graph compilation and execution."""

from __future__ import annotations

from unittest.mock import patch

from langgraph.checkpoint.memory import InMemorySaver

from research_agent.graph import compile_graph
from research_agent.state import initial_state


def test_graph_compiles() -> None:
    app = compile_graph(checkpointer=InMemorySaver())
    assert app is not None


@patch("research_agent.graph.supervisor_node")
@patch("research_agent.graph.search_node")
@patch("research_agent.graph.analysis_node")
@patch("research_agent.graph.writer_node")
def test_graph_end_to_end_mocked(
    mock_writer,
    mock_analysis,
    mock_search,
    mock_supervisor,
) -> None:
    call_count = {"n": 0}

    def supervisor_side_effect(state):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return {"next_agent": "search"}
        if call_count["n"] == 2:
            return {"next_agent": "analysis"}
        if call_count["n"] == 3:
            return {"next_agent": "writer"}
        return {"next_agent": "FINISH"}

    mock_supervisor.side_effect = supervisor_side_effect
    mock_search.side_effect = lambda state: {
        "search_results": [{"title": "Test", "url": "https://example.com"}],
        "messages": [],
        "step_count": state["step_count"] + 1,
    }
    mock_analysis.side_effect = lambda state: {
        "analysis": "Key finding about the topic.",
        "messages": [],
        "step_count": state["step_count"] + 1,
    }
    mock_writer.side_effect = lambda state: {
        "report": "# Test Report\n\nFindings here.",
        "messages": [],
        "step_count": state["step_count"] + 1,
    }

    app = compile_graph(checkpointer=InMemorySaver())
    state = initial_state("Test topic", "test-e2e", max_steps=30)
    config = {"configurable": {"thread_id": "test-e2e"}}

    result = app.invoke(state, config=config)
    assert result["report"].startswith("# Test Report")
    assert result["analysis"]
    assert result["search_results"]
