"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";

import { ActivityPanel } from "@/components/research/activity-panel";
import { AgentPipeline } from "@/components/research/agent-pipeline";
import { BudgetFooter } from "@/components/research/budget-footer";
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
import {
  buildActivityLogFromSteps,
  createCompletionLogEntry,
  createErrorLogEntry,
  createSeedLogEntry,
  diffStepsToLogEntries,
  type ActivityLogEntry,
} from "@/lib/activity-log";
import { IDLE_STEPS } from "@/lib/mock-data";
import type { PipelineStep, ResearchHistoryItem, ResearchStatusResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 1500;

export function ResearchWorkspace() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>(IDLE_STEPS);
  const [topic, setTopic] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sessionCost, setSessionCost] = useState<number | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);
  const [budgetExceeded, setBudgetExceeded] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const lastFocusedReportRef = useRef<string | null>(null);
  const stepsRef = useRef<PipelineStep[]>(IDLE_STEPS);
  const activityLogCacheRef = useRef<Map<string, ActivityLogEntry[]>>(new Map());

  const setActivityLogForThread = useCallback((
    threadId: string | null,
    value: ActivityLogEntry[] | ((prev: ActivityLogEntry[]) => ActivityLogEntry[]),
  ) => {
    setActivityLog((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (threadId && next.length > 0) {
        activityLogCacheRef.current.set(threadId, next);
      }
      return next;
    });
  }, []);

  const appendActivityLog = useCallback((entries: ActivityLogEntry[]) => {
    if (entries.length === 0) {
      return;
    }
    const threadId = threadIdRef.current;
    setActivityLog((prev) => {
      const next = [...prev, ...entries];
      if (threadId) {
        activityLogCacheRef.current.set(threadId, next);
      }
      return next;
    });
  }, []);

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

    const prevSteps = stepsRef.current;
    const nextSteps = status.steps;
    appendActivityLog(diffStepsToLogEntries(prevSteps, nextSteps));
    stepsRef.current = nextSteps;
    setSteps(nextSteps);
    setTopic(status.topic);
    setSessionCost(status.session_cost);
    setMaxCost(status.max_cost);
    setBudgetExceeded(status.budget_exceeded);

    if (status.report) {
      setReport(status.report);
    }

    if (status.status === "completed") {
      setIsRunning(false);
      stopPolling();
      setError(null);
      setInfo(null);
      setActivityLogForThread(status.thread_id, (prev) => {
        const hasDoneEntry = prev.some(
          (entry) => entry.agent === "Done" && entry.message.includes("successfully"),
        );
        return hasDoneEntry ? prev : [...prev, createCompletionLogEntry()];
      });
      void loadHistory();
      return;
    }

    if (status.status === "failed" || status.status === "cancelled") {
      setIsRunning(false);
      stopPolling();
      setInfo(null);
      const errorMessage = status.error
        ?? (status.status === "cancelled" ? "Research cancelled." : "Research failed.");
      setError(errorMessage);
      appendActivityLog([createErrorLogEntry(errorMessage)]);
      void loadHistory();
    }

    if (status.status === "running") {
      setInfo(null);
    }
  }, [appendActivityLog, loadHistory, setActivityLogForThread, stopPolling]);

  const pollStatus = useCallback(async (threadId: string) => {
    try {
      const status = await getResearchStatus(threadId);
      applyStatus(status);
    } catch (err) {
      setIsRunning(false);
      stopPolling();
      const message = err instanceof ResearchApiError
        ? err.message
        : "Unable to reach the research API. Is it running on port 8000?";
      setError(message);
      appendActivityLog([createErrorLogEntry(message)]);
    }
  }, [applyStatus, appendActivityLog, stopPolling]);

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

  function resetRunState(submittedTopic: string) {
    stopPolling();
    setIsRunning(true);
    setReport(null);
    setError(null);
    setInfo(null);
    lastFocusedReportRef.current = null;
    setSessionCost(null);
    setMaxCost(null);
    setBudgetExceeded(false);
    setTopic(submittedTopic);
    const initialSteps = IDLE_STEPS.map((step, index) =>
      index === 0 ? { ...step, status: "active" as const } : step,
    );
    stepsRef.current = initialSteps;
    setSteps(initialSteps);
    setActivityLog([createSeedLogEntry()]);
  }

  async function handleSubmit(submittedTopic: string) {
    resetRunState(submittedTopic);

    try {
      const started = await startResearch(submittedTopic);
      threadIdRef.current = started.thread_id;
      setActiveThreadId(started.thread_id);
      setActivityLogForThread(started.thread_id, (log) => log);
      await pollStatus(started.thread_id);
      watchResearch(started.thread_id);
    } catch (err) {
      setIsRunning(false);
      const message = err instanceof ResearchApiError
        ? err.message
        : "Unable to start research. Is the API running on port 8000?";
      setError(message);
      appendActivityLog([createErrorLogEntry(message)]);
    }
  }

  async function handleCancel() {
    const threadId = threadIdRef.current;
    stopPolling();
    if (threadId) {
      try {
        const status = await cancelResearch(threadId);
        const nextSteps = status.steps.length > 0 ? status.steps : IDLE_STEPS;
        appendActivityLog(diffStepsToLogEntries(stepsRef.current, nextSteps));
        stepsRef.current = nextSteps;
        setSteps(nextSteps);
        setError(status.error);
        appendActivityLog([createErrorLogEntry("Research cancelled.")]);
        void loadHistory();
      } catch (err) {
        const message = err instanceof ResearchApiError
          ? err.message
          : "Unable to cancel research on the API.";
        setError(message);
        appendActivityLog([createErrorLogEntry(message)]);
      }
    }
    setActiveThreadId(null);
    setIsRunning(false);
    setTopic(null);
    setReport(null);
  }

  async function handleResumeHistory(item: ResearchHistoryItem) {
    resetRunState(item.topic);
    setInfo("Resuming from saved checkpoint…");
    setActiveThreadId(item.thread_id);
    threadIdRef.current = item.thread_id;
    setActivityLogForThread(item.thread_id, (log) => log);

    try {
      const started = await startResearch(item.topic, item.thread_id);
      await pollStatus(started.thread_id);
      watchResearch(started.thread_id);
    } catch (err) {
      setIsRunning(false);
      setInfo(null);
      const message = err instanceof ResearchApiError
        ? err.message
        : "Unable to resume research.";
      setError(message);
      appendActivityLog([createErrorLogEntry(message)]);
    }
  }

  async function handleOpenHistory(threadId: string) {
    stopPolling();
    setError(null);
    setInfo(null);
    try {
      const status = await getResearchStatus(threadId);
      if (status.status === "not_found") {
        setError("Saved report not found.");
        return;
      }
      threadIdRef.current = threadId;
      setActiveThreadId(threadId);
      setTopic(status.topic);
      const nextSteps = status.steps.length > 0 ? status.steps : IDLE_STEPS;
      stepsRef.current = nextSteps;
      setSteps(nextSteps);
      setReport(status.report);
      setSessionCost(status.session_cost);
      setMaxCost(status.max_cost);
      setBudgetExceeded(status.budget_exceeded);
      setIsRunning(status.status === "running");

      const cached = activityLogCacheRef.current.get(threadId);
      if (cached?.length) {
        setActivityLog(cached);
      } else if (status.status === "running") {
        setActivityLogForThread(threadId, [createSeedLogEntry()]);
        watchResearch(threadId);
      } else {
        setActivityLogForThread(
          threadId,
          buildActivityLogFromSteps(nextSteps, {
            error: status.error,
            jobStatus: status.status,
          }),
        );
      }

      if (status.status === "running" && cached?.length) {
        watchResearch(threadId);
      }
    } catch (err) {
      const message = err instanceof ResearchApiError
        ? err.message
        : "Unable to open saved report.";
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bot className="size-7" aria-hidden />
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Multi-Agent Research
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          AI agents working together to deliver in-depth research.
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
          {info ? (
            <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <AgentPipeline steps={steps} isRunning={isRunning} hasReport={Boolean(report)} />
          <ActivityPanel activityLog={activityLog} isRunning={isRunning} />
          <BudgetFooter
            isRunning={isRunning}
            sessionCost={sessionCost}
            maxCost={maxCost}
            budgetExceeded={budgetExceeded}
          />
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
