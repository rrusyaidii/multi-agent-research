"""Shared graph state and routing models."""

from __future__ import annotations

import operator
from typing import Annotated, Literal

from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

AgentRoute = Literal["search", "analysis", "writer", "FINISH"]


class RouteDecision(BaseModel):
    next_agent: AgentRoute = Field(
        description="The next specialist agent to invoke, or FINISH when the report is complete.",
    )
    reasoning: str = Field(
        default="",
        description="Brief explanation for the routing decision.",
    )


class ResearchState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    topic: str
    search_results: list[dict]
    analysis: str
    report: str
    next_agent: str
    step_count: int
    max_steps: int
    thread_id: str


def initial_state(topic: str, thread_id: str, max_steps: int) -> ResearchState:
    return {
        "messages": [],
        "topic": topic,
        "search_results": [],
        "analysis": "",
        "report": "",
        "next_agent": "search",
        "step_count": 0,
        "max_steps": max_steps,
        "thread_id": thread_id,
    }
