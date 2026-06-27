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
