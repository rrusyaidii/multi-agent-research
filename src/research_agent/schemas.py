"""Pydantic request/response models for the HTTP API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

AgentStep = Literal["supervisor", "search", "analysis", "writer", "finish"]
StepStatus = Literal["idle", "active", "done", "error"]
JobStatus = Literal["running", "completed", "failed", "not_found"]


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


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
