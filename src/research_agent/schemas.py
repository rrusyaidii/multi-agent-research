"""Pydantic request/response models for the HTTP API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

AgentStep = Literal["supervisor", "search", "analysis", "writer", "finish"]
StepStatus = Literal["idle", "active", "done", "error"]
JobStatus = Literal["running", "completed", "failed", "cancelled", "not_found"]


class ResearchRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    thread_id: str | None = None


class PipelineStepSchema(BaseModel):
    agent: AgentStep
    status: StepStatus
    label: str


class ResearchStartResponse(BaseModel):
    thread_id: str
    status: Literal["running"]
    topic: str


class ResearchStatusResponse(BaseModel):
    thread_id: str
    topic: str
    status: JobStatus
    steps: list[PipelineStepSchema]
    report: str | None = None
    analysis: str | None = None
    error: str | None = None
    step_count: int = 0
    max_steps: int = 0
    session_cost: float | None = None
    max_cost: float | None = None
    budget_exceeded: bool = False


class ResearchHistoryItem(BaseModel):
    thread_id: str
    topic: str
    status: Literal["running", "completed", "failed", "cancelled"]
    created_at: str
    updated_at: str
    has_report: bool
    error: str | None = None


class ResearchHistoryResponse(BaseModel):
    items: list[ResearchHistoryItem]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
