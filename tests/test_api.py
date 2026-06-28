"""Tests for the FastAPI research endpoints."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from research_agent.api import app
from research_agent.service import JobConflictError, JobRecord


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestHealth:
    def test_health_returns_ok(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestCreateResearch:
    def test_post_research_returns_running(self, client: TestClient) -> None:
        fake_job = JobRecord(
            thread_id="research-abc12345",
            topic="AI agents",
            status="running",
        )
        with patch("research_agent.api.start_research", return_value=fake_job):
            response = client.post("/research", json={"topic": "AI agents"})

        assert response.status_code == 200
        data = response.json()
        assert data["thread_id"] == "research-abc12345"
        assert data["status"] == "running"
        assert data["topic"] == "AI agents"

    def test_post_research_rejects_short_topic(self, client: TestClient) -> None:
        response = client.post("/research", json={"topic": "ab"})
        assert response.status_code == 422

    def test_post_research_conflict_returns_409(self, client: TestClient) -> None:
        with patch(
            "research_agent.api.start_research",
            side_effect=JobConflictError("already running"),
        ):
            response = client.post(
                "/research",
                json={"topic": "AI agents", "thread_id": "research-dup"},
            )

        assert response.status_code == 409


class TestResearchStatus:
    def test_status_returns_pipeline_steps(self, client: TestClient) -> None:
        payload = {
            "thread_id": "research-abc12345",
            "topic": "AI agents",
            "status": "running",
            "steps": [
                {"agent": "supervisor", "status": "done", "label": "Supervisor"},
                {"agent": "search", "status": "active", "label": "Search"},
                {"agent": "analysis", "status": "idle", "label": "Analysis"},
                {"agent": "writer", "status": "idle", "label": "Writer"},
                {"agent": "finish", "status": "idle", "label": "Done"},
            ],
            "report": None,
            "analysis": None,
            "error": None,
        }
        with patch("research_agent.api.build_status_payload", return_value=payload):
            response = client.get("/status/research-abc12345")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert len(data["steps"]) == 5
        assert data["steps"][1]["agent"] == "search"
        assert data["steps"][1]["status"] == "active"

    def test_status_unknown_thread_returns_not_found(self, client: TestClient) -> None:
        with patch("research_agent.api.build_status_payload", return_value=None):
            response = client.get("/status/unknown-thread")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_found"
        assert data["steps"] == []

    def test_status_completed_includes_report(self, client: TestClient) -> None:
        payload = {
            "thread_id": "research-done",
            "topic": "Quantum computing",
            "status": "completed",
            "steps": [
                {"agent": "supervisor", "status": "done", "label": "Supervisor"},
                {"agent": "search", "status": "done", "label": "Search"},
                {"agent": "analysis", "status": "done", "label": "Analysis"},
                {"agent": "writer", "status": "done", "label": "Writer"},
                {"agent": "finish", "status": "done", "label": "Done"},
            ],
            "report": "# Report\n\nContent here.",
            "analysis": "Summary analysis.",
            "error": None,
        }
        with patch("research_agent.api.build_status_payload", return_value=payload):
            response = client.get("/status/research-done")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["report"] == "# Report\n\nContent here."


class TestResearchStream:
    def test_stream_includes_no_cache_headers(self, client: TestClient) -> None:
        payload = {
            "thread_id": "research-stream",
            "topic": "AI agents",
            "status": "completed",
            "steps": [],
            "report": "# Done",
            "analysis": None,
            "error": None,
        }
        with patch("research_agent.api.build_status_payload", return_value=payload):
            with client.stream("GET", "/research/research-stream/stream") as response:
                assert response.status_code == 200
                assert response.headers["cache-control"] == "no-cache"
                assert response.headers["connection"] == "keep-alive"
                assert response.headers["x-accel-buffering"] == "no"
                next(response.iter_lines())


class TestResearchHistory:
    def test_history_returns_recent_items(self, client: TestClient) -> None:
        payload = [
            {
                "thread_id": "research-done",
                "topic": "Quantum computing",
                "status": "completed",
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:01:00+00:00",
                "has_report": True,
                "error": None,
            }
        ]
        with patch("research_agent.api.build_history_payload", return_value=payload):
            response = client.get("/research")

        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["thread_id"] == "research-done"


class TestCancelResearch:
    def test_cancel_returns_cancelled_status(self, client: TestClient) -> None:
        payload = {
            "thread_id": "research-cancel",
            "topic": "AI agents",
            "status": "cancelled",
            "steps": [],
            "report": None,
            "analysis": None,
            "error": "Research was cancelled by the user.",
        }
        with (
            patch("research_agent.api.cancel_research", return_value=JobRecord(
                thread_id="research-cancel",
                topic="AI agents",
                status="cancelled",
            )),
            patch("research_agent.api.build_status_payload", return_value=payload),
        ):
            response = client.post("/research/research-cancel/cancel")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"
        assert data["error"] == "Research was cancelled by the user."


class TestDeleteResearch:
    def test_delete_returns_deleted(self, client: TestClient) -> None:
        with patch("research_agent.api.delete_research") as delete_mock:
            response = client.delete("/research/research-done")

        assert response.status_code == 200
        assert response.json() == {"deleted": True}
        delete_mock.assert_called_once_with("research-done")

    def test_delete_running_returns_409(self, client: TestClient) -> None:
        with patch(
            "research_agent.api.delete_research",
            side_effect=JobConflictError("Cannot delete running job"),
        ):
            response = client.delete("/research/research-running")

        assert response.status_code == 409

    def test_delete_missing_returns_404(self, client: TestClient) -> None:
        with patch(
            "research_agent.api.delete_research",
            side_effect=ValueError("Unknown thread_id"),
        ):
            response = client.delete("/research/unknown")

        assert response.status_code == 404

    def test_clear_history_returns_count(self, client: TestClient) -> None:
        with patch("research_agent.api.clear_research_history", return_value=3):
            response = client.delete("/research")

        assert response.status_code == 200
        assert response.json() == {"deleted_count": 3}
