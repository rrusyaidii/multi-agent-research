"""Supervisor node — routes work to specialist agents."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage

from research_agent.config import get_llm, get_settings
from research_agent.cost import is_budget_exceeded
from research_agent.state import AgentRoute, ResearchState, RouteDecision
from research_agent.utils import invoke_with_retry

logger = logging.getLogger(__name__)

SUPERVISOR_PROMPT = """You are the supervisor for a multi-agent research pipeline.

Available routes:
- search: gather web information (use when search_results is empty or insufficient)
- analysis: summarise and extract insights (use when search_results exist but analysis is empty)
- writer: compile the markdown report (use when analysis exists but report is empty or thin)
- FINISH: stop when the report is complete and satisfactory

Rules:
1. Prefer the pipeline order: search → analysis → writer → FINISH
2. If search_results is empty, route to search
3. If search_results has fewer than 5 items and step budget allows, route back to search for more depth
4. If analysis is empty but search_results exist, route to analysis
5. If report is empty but analysis exists, route to writer
6. If report looks complete with comparison and recommendations, route to FINISH
7. Never route to an agent that cannot make progress
8. Thin or snippet-only search results are not enough — prefer another search pass when budget allows

Respond with structured output only."""

VALID_ROUTES: set[AgentRoute] = {"search", "analysis", "writer", "FINISH"}


def _state_summary(state: ResearchState) -> str:
    return json.dumps(
        {
            "topic": state["topic"],
            "search_results_count": len(state.get("search_results", [])),
            "analysis_length": len(state.get("analysis", "")),
            "report_length": len(state.get("report", "")),
            "step_count": state.get("step_count", 0),
            "max_steps": state.get("max_steps", 30),
        },
        indent=2,
    )


def _heuristic_route(state: ResearchState) -> AgentRoute:
    if not state.get("search_results"):
        return "search"
    if not state.get("analysis", "").strip():
        return "analysis"
    if not state.get("report", "").strip():
        return "writer"
    return "FINISH"


def supervisor_node(state: ResearchState) -> dict:
    step_count = state.get("step_count", 0)
    max_steps = state.get("max_steps", 30)

    if step_count >= max_steps:
        logger.warning("Step budget exceeded (%s/%s); forcing FINISH", step_count, max_steps)
        return {"next_agent": "FINISH"}

    max_cost_myr = get_settings().max_cost_per_session_myr
    if is_budget_exceeded(step_count, max_cost_myr):
        logger.warning(
            "Cost budget exceeded (step_count=%s, cap=RM%s); forcing FINISH",
            step_count,
            max_cost_myr,
        )
        return {"next_agent": "FINISH"}

    llm = get_llm().with_structured_output(RouteDecision)
    summary = _state_summary(state)

    def _run() -> RouteDecision:
        return llm.invoke(
            [
                SystemMessage(content=SUPERVISOR_PROMPT),
                HumanMessage(content=f"Current state:\n{summary}\n\nChoose the next agent."),
                *state.get("messages", [])[-4:],
            ]
        )

    decision = invoke_with_retry(_run)

    if decision is None:
        next_agent = _heuristic_route(state)
        logger.warning("Supervisor LLM failed; using heuristic route: %s", next_agent)
        return {"next_agent": next_agent}

    next_agent = decision.next_agent
    if next_agent not in VALID_ROUTES:
        logger.warning("Invalid route %r; defaulting to FINISH", next_agent)
        next_agent = "FINISH"

    return {"next_agent": next_agent}


def route_from_supervisor(state: ResearchState) -> str:
    return state.get("next_agent", "FINISH")
