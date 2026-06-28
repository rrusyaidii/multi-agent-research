"""Unit tests for the research service layer."""

from __future__ import annotations

import pytest

from research_agent.service import (
    AGENT_LABELS,
    PIPELINE_AGENTS,
    _resolve_display_node,
    build_pipeline_steps,
)


class TestBuildPipelineSteps:
    def test_idle_when_nothing_started(self) -> None:
        steps = build_pipeline_steps([], None, "running")
        assert len(steps) == len(PIPELINE_AGENTS)
        assert all(step["status"] == "idle" for step in steps)
        assert steps[0]["agent"] == "supervisor"
        assert steps[0]["label"] == AGENT_LABELS["supervisor"]

    def test_active_node_marked_active(self) -> None:
        steps = build_pipeline_steps(["supervisor"], "search", "running")
        by_agent = {step["agent"]: step for step in steps}
        assert by_agent["supervisor"]["status"] == "done"
        assert by_agent["search"]["status"] == "active"
        assert by_agent["analysis"]["status"] == "idle"

    def test_completed_marks_all_done(self) -> None:
        executed = ["supervisor", "search", "analysis", "writer"]
        steps = build_pipeline_steps(executed, None, "completed")
        assert all(step["status"] == "done" for step in steps)
        assert steps[-1]["agent"] == "finish"

    def test_failed_marks_current_node_error(self) -> None:
        steps = build_pipeline_steps(
            ["supervisor", "search"],
            "search",
            "failed",
        )
        by_agent = {step["agent"]: step for step in steps}
        assert by_agent["search"]["status"] == "error"
        assert by_agent["supervisor"]["status"] == "done"

    def test_step_shape_matches_frontend(self) -> None:
        steps = build_pipeline_steps(["supervisor"], "search", "running")
        for step in steps:
            assert set(step.keys()) == {"agent", "status", "label"}
            assert step["agent"] in PIPELINE_AGENTS
            assert step["status"] in {"idle", "active", "done", "error"}

    def test_supervisor_active_at_job_start(self) -> None:
        steps = build_pipeline_steps([], "supervisor", "running")
        by_agent = {step["agent"]: step for step in steps}
        assert by_agent["supervisor"]["status"] == "active"
        assert by_agent["search"]["status"] == "idle"

    def test_finish_active_after_writer_with_report(self) -> None:
        executed = ["supervisor", "search", "supervisor", "analysis", "supervisor", "writer"]
        steps = build_pipeline_steps(executed, "finish", "running")
        by_agent = {step["agent"]: step for step in steps}
        assert by_agent["writer"]["status"] == "done"
        assert by_agent["finish"]["status"] == "active"


class TestResolveDisplayNode:
    def test_supervisor_routes_to_search(self) -> None:
        assert _resolve_display_node("supervisor", {"next_agent": "search"}) == "search"

    def test_supervisor_routes_to_finish(self) -> None:
        assert _resolve_display_node("supervisor", {"next_agent": "FINISH"}) == "finish"

    def test_search_returns_to_supervisor(self) -> None:
        assert _resolve_display_node("search", {}) == "supervisor"

    def test_writer_with_report_shows_finish(self) -> None:
        assert _resolve_display_node("writer", {"report": "# Report\n\nContent"}) == "finish"

    def test_writer_without_report_returns_to_supervisor(self) -> None:
        assert _resolve_display_node("writer", {"report": ""}) == "supervisor"
