"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ActivityPanel } from "@/components/research/activity-panel";
import { AgentPipeline } from "@/components/research/agent-pipeline";
import { ReportHistory } from "@/components/research/report-history";
import { ReportViewer } from "@/components/research/report-viewer";
import { TopicForm } from "@/components/research/topic-form";
import {
  cancelResearch,
  getResearchHistory,
  getResearchStatus,
  ResearchApiError,
  startResearch,
  subscribeResearchStatus,
} from "@/lib/api";
import { IDLE_STEPS } from "@/lib/mock-data";
import type { PipelineStep, ResearchHistoryItem, ResearchStatusResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 1500;

export function ResearchWorkspace() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>(IDLE_STEPS);
  const [topic, setTopic] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [maxSteps, setMaxSteps] = useState(0);
  const [sessionCost, setSessionCost] = useState<number | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);
  const [budgetExceeded, setBudgetExceeded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const lastFocusedReportRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const response = await getResearchHistory();
      setHistory(response.items);
    } catch {
      // History is helpful but not critical to running research.
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getResearchHistory().then((response) => {
      if (!cancelled) {
        setHistory(response.items);
      }
    }).catch(() => {
      // History is helpful but not critical to running research.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!report || lastFocusedReportRef.current === report) {
      return;
    }

    lastFocusedReportRef.current = report;
    const reportEl = document.getElementById("report");
    reportEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    reportEl?.querySelector<HTMLElement>("article")?.focus({ preventScroll: true });
  }, [report]);

  const applyStatus = useCallback((status: ResearchStatusResponse) => {
    if (status.status === "not_found") {
      setError("Research session not found.");
      setIsRunning(false);
      stopPolling();
      return;
    }

    setSteps(status.steps);
    setTopic(status.topic);
    setStepCount(status.step_count);
    setMaxSteps(status.max_steps);
    setSessionCost(status.session_cost);
    setMaxCost(status.max_cost);
    setBudgetExceeded(status.budget_exceeded);

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
      void loadHistory();
      return;
    }

    if (status.status === "failed" || status.status === "cancelled") {
      setIsRunning(false);
      stopPolling();
      setError(status.error ?? (status.status === "cancelled" ? "Research cancelled." : "Research failed."));
      void loadHistory();
    }
  }, [loadHistory, stopPolling]);

  const pollStatus = useCallback(async (threadId: string) => {
    try {
      const status = await getResearchStatus(threadId);
      applyStatus(status);
    } catch (err) {
      setIsRunning(false);
      stopPolling();
      if (err instanceof ResearchApiError) {
        setError(err.message);
      } else {
        setError("Unable to reach the research API. Is it running on port 8000?");
      }
    }
  }, [applyStatus, stopPolling]);

  const startPollingFallback = useCallback((threadId: string) => {
    if (pollRef.current) {
      return;
    }

    pollRef.current = setInterval(() => {
      void pollStatus(threadId);
    }, POLL_INTERVAL_MS);
  }, [pollStatus]);

  const watchResearch = useCallback((threadId: string) => {
    streamRef.current = subscribeResearchStatus(
      threadId,
      applyStatus,
      () => startPollingFallback(threadId),
    );
  }, [applyStatus, startPollingFallback]);

  async function handleSubmit(submittedTopic: string) {
    stopPolling();
    setIsRunning(true);
    setReport(null);
    setAnalysis(null);
    setError(null);
    lastFocusedReportRef.current = null;
    setStepCount(0);
    setMaxSteps(0);
    setSessionCost(null);
    setMaxCost(null);
    setBudgetExceeded(false);
    setTopic(submittedTopic);
    setSteps(IDLE_STEPS.map((step, index) =>
      index === 0 ? { ...step, status: "active" } : step,
    ));

    try {
      const started = await startResearch(submittedTopic);
      threadIdRef.current = started.thread_id;
      setActiveThreadId(started.thread_id);
      await pollStatus(started.thread_id);
      watchResearch(started.thread_id);
    } catch (err) {
      setIsRunning(false);
      if (err instanceof ResearchApiError) {
        setError(err.message);
      } else {
        setError("Unable to start research. Is the API running on port 8000?");
      }
    }
  }

  async function handleCancel() {
    const threadId = threadIdRef.current;
    stopPolling();
    if (threadId) {
      try {
        const status = await cancelResearch(threadId);
        setSteps(status.steps.length > 0 ? status.steps : IDLE_STEPS);
        setError(status.error);
        void loadHistory();
      } catch (err) {
        if (err instanceof ResearchApiError) {
          setError(err.message);
        } else {
          setError("Unable to cancel research on the API.");
        }
      }
    }
    setActiveThreadId(null);
    setIsRunning(false);
    setTopic(null);
    setReport(null);
    setAnalysis(null);
  }

  async function handleResumeHistory(item: ResearchHistoryItem) {
    stopPolling();
    setIsRunning(true);
    setReport(null);
    setAnalysis(null);
    setError(null);
    setTopic(item.topic);
    setActiveThreadId(item.thread_id);
    threadIdRef.current = item.thread_id;
    setSteps(IDLE_STEPS.map((step, index) =>
      index === 0 ? { ...step, status: "active" } : step,
    ));

    try {
      const started = await startResearch(item.topic, item.thread_id);
      await pollStatus(started.thread_id);
      watchResearch(started.thread_id);
    } catch (err) {
      setIsRunning(false);
      if (err instanceof ResearchApiError) {
        setError(err.message);
      } else {
        setError("Unable to resume research.");
      }
    }
  }

  async function handleOpenHistory(threadId: string) {
    stopPolling();
    setError(null);
    try {
      const status = await getResearchStatus(threadId);
      if (status.status === "not_found") {
        setError("Saved report not found.");
        return;
      }
      threadIdRef.current = threadId;
      setActiveThreadId(threadId);
      setTopic(status.topic);
      setSteps(status.steps.length > 0 ? status.steps : IDLE_STEPS);
      setAnalysis(status.analysis);
      setReport(status.report);
      setIsRunning(status.status === "running");

      if (status.status === "running") {
        watchResearch(threadId);
      }
    } catch (err) {
      if (err instanceof ResearchApiError) {
        setError(err.message);
      } else {
        setError("Unable to open saved report.");
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          Multi-agent research
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Research any topic
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Enter a question below. Agents will search the web, analyze findings, and compile a structured report you can download.
        </p>
      </header>

      <div className="grid w-full flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-stretch lg:gap-8">
        <div
          className={cn(
            "flex flex-col gap-6 lg:order-none",
            report ? "order-2" : "order-1",
          )}
        >
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
          <ActivityPanel
            steps={steps}
            analysis={analysis}
            isRunning={isRunning}
            stepCount={stepCount}
            maxSteps={maxSteps}
            sessionCost={sessionCost}
            maxCost={maxCost}
            budgetExceeded={budgetExceeded}
          />
          <AgentPipeline steps={steps} isRunning={isRunning} hasReport={Boolean(report)} />
          <ReportHistory
            reports={history}
            isLoading={isHistoryLoading}
            activeThreadId={activeThreadId}
            onOpen={handleOpenHistory}
            onResume={handleResumeHistory}
          />
        </div>
        <div
          className={cn(
            "flex w-full flex-col lg:sticky lg:top-20 lg:order-none",
            report
              ? "order-1 lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:self-start"
              : "order-2 lg:min-h-[420px] lg:self-stretch",
          )}
        >
          <ReportViewer
            report={report}
            topic={topic}
            isRunning={isRunning}
          />
        </div>
      </div>
    </div>
  );
}
