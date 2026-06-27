"""Tests for supervisor routing."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from research_agent.state import ResearchState
from research_agent.supervisor import RouteDecision, supervisor_node


def _base_state(**overrides) -> ResearchState:
    state: ResearchState = {
        "messages": [],
        "topic": "AI agents",
        "search_results": [],
        "analysis": "",
        "report": "",
        "next_agent": "search",
        "step_count": 0,
        "max_steps": 30,
        "thread_id": "test-thread",
    }
    state.update(overrides)
    return state


def test_supervisor_forces_finish_on_budget() -> None:
    state = _base_state(step_count=30, max_steps=30)
    result = supervisor_node(state)
    assert result["next_agent"] == "FINISH"


@patch("research_agent.supervisor.get_llm")
@patch("research_agent.supervisor.invoke_with_retry")
def test_supervisor_invalid_route_defaults_to_finish(
    mock_retry: MagicMock,
    mock_get_llm: MagicMock,
) -> None:
    mock_llm = MagicMock()
    mock_get_llm.return_value = mock_llm
    mock_llm.with_structured_output.return_value = mock_llm

    class BadDecision:
        next_agent = "invalid"
        reasoning = "bad"

    mock_retry.return_value = BadDecision()

    state = _base_state(
        search_results=[{"title": "x"}],
        analysis="done",
        report="# Report\n\nComplete",
    )
    result = supervisor_node(state)
    assert result["next_agent"] == "FINISH"


@patch("research_agent.supervisor.get_llm")
@patch("research_agent.supervisor.invoke_with_retry")
def test_supervisor_llm_failure_uses_heuristic(
    mock_retry: MagicMock,
    mock_get_llm: MagicMock,
) -> None:
    mock_get_llm.return_value = MagicMock()
    mock_retry.return_value = None

    state = _base_state()
    result = supervisor_node(state)
    assert result["next_agent"] == "search"


@patch("research_agent.supervisor.get_llm")
@patch("research_agent.supervisor.invoke_with_retry")
def test_supervisor_routes_to_analysis(
    mock_retry: MagicMock,
    mock_get_llm: MagicMock,
) -> None:
    mock_get_llm.return_value = MagicMock()
    mock_retry.return_value = RouteDecision(next_agent="analysis", reasoning="ready")

    state = _base_state(search_results=[{"title": "found", "url": "https://x.com"}])
    result = supervisor_node(state)
    assert result["next_agent"] == "analysis"
