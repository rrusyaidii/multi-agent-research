"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ActivityPanel } from "@/components/research/activity-panel";
import { AgentPipeline } from "@/components/research/agent-pipeline";
import { ReportViewer } from "@/components/research/report-viewer";
import { TopicForm } from "@/components/research/topic-form";
import { getResearchStatus, ResearchApiError, startResearch } from "@/lib/api";
import { IDLE_STEPS } from "@/lib/mock-data";
import type { PipelineStep } from "@/lib/types";

const POLL_INTERVAL_MS = 1500;

export function ResearchWorkspace() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>(IDLE_STEPS);
  const [topic, setTopic] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const pollStatus = useCallback(async (threadId: string) => {
    try {
      const status = await getResearchStatus(threadId);

      if (status.status === "not_found") {
        setError("Research session not found.");
        setIsRunning(false);
        stopPolling();
        return;
      }

      setSteps(status.steps);
      setTopic(status.topic);

      if (status.analysis) {
        setAnalysis(status.analysis);
      }

      if (status.report) {
        setReport(status.report);
      }

      if (status.status === "completed") {
        setIsRunning(false);
        stopPolling();
        setError(null);
        return;
      }

      if (status.status === "failed") {
        setIsRunning(false);
        stopPolling();
        setError(status.error ?? "Research failed.");
      }
    } catch (err) {
      setIsRunning(false);
      stopPolling();
      if (err instanceof ResearchApiError) {
        setError(err.message);
      } else {
        setError("Unable to reach the research API. Is it running on port 8000?");
      }
    }
  }, [stopPolling]);

  async function handleSubmit(submittedTopic: string) {
    stopPolling();
    setIsRunning(true);
    setReport(null);
    setAnalysis(null);
    setError(null);
    setTopic(submittedTopic);
    setSteps(IDLE_STEPS.map((step, index) =>
      index === 0 ? { ...step, status: "active" } : step,
    ));

    try {
      const started = await startResearch(submittedTopic);
      threadIdRef.current = started.thread_id;
      await pollStatus(started.thread_id);

      pollRef.current = setInterval(() => {
        void pollStatus(started.thread_id);
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setIsRunning(false);
      if (err instanceof ResearchApiError) {
        setError(err.message);
      } else {
        setError("Unable to start research. Is the API running on port 8000?");
      }
    }
  }

  function handleCancel() {
    stopPolling();
    threadIdRef.current = null;
    setIsRunning(false);
    setSteps(IDLE_STEPS);
    setTopic(null);
    setReport(null);
    setAnalysis(null);
    setError(null);
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8 lg:px-8">
      <div className="flex flex-col gap-6">
        <TopicForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isRunning={isRunning}
          defaultTopic={topic ?? ""}
        />
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <ActivityPanel steps={steps} analysis={analysis} isRunning={isRunning} />
        <AgentPipeline steps={steps} isRunning={isRunning} />
      </div>
      <div className="flex min-h-[420px] flex-col lg:min-h-0">
        <ReportViewer
          report={report}
          topic={topic}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}
