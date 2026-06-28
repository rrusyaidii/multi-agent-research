"""Tests for JobStore delete operations."""

from __future__ import annotations

from pathlib import Path

from research_agent.job_store import JobRecord, JobStore


def test_delete_removes_job(tmp_path: Path) -> None:
    store = JobStore(tmp_path / "jobs.db")
    store.set(
        JobRecord(
            thread_id="research-delete-me",
            topic="Delete me",
            status="completed",
        ),
    )

    assert store.delete("research-delete-me") is True
    assert store.get("research-delete-me") is None


def test_delete_all_finished_keeps_running(tmp_path: Path) -> None:
    store = JobStore(tmp_path / "jobs.db")
    store.set(JobRecord(thread_id="running-job", topic="Running", status="running"))
    store.set(JobRecord(thread_id="done-job", topic="Done", status="completed"))
    store.set(JobRecord(thread_id="failed-job", topic="Failed", status="failed"))

    deleted = store.delete_all_finished()

    assert {job.thread_id for job in deleted} == {"done-job", "failed-job"}
    assert store.get("running-job") is not None
    assert store.get("done-job") is None
