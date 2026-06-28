import { AGENT_ACTIVITY } from "@/lib/agent-activity";
import { IDLE_STEPS } from "@/lib/mock-data";
import type { AgentStep, JobStatus, PipelineStep } from "@/lib/types";

export interface ActivityLogEntry {
  time: string;
  agent: string;
  message: string;
}

const AGENT_LABELS: Record<AgentStep, string> = {
  supervisor: "Supervisor",
  search: "Search",
  analysis: "Analysis",
  writer: "Writer",
  finish: "Done",
};

export function formatLogTime(date = new Date()): string {
  return date.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function createSeedLogEntry(): ActivityLogEntry {
  return {
    time: formatLogTime(),
    agent: "Supervisor",
    message: "Planning research plan...",
  };
}

export function diffStepsToLogEntries(
  prev: PipelineStep[],
  next: PipelineStep[],
): ActivityLogEntry[] {
  const entries: ActivityLogEntry[] = [];
  const time = formatLogTime();

  for (let index = 0; index < next.length; index += 1) {
    const prevStep = prev[index];
    const nextStep = next[index];
    if (!prevStep || prevStep.status === nextStep.status) {
      continue;
    }

    const label = AGENT_LABELS[nextStep.agent];

    if (nextStep.status === "active") {
      entries.push({
        time,
        agent: label,
        message: AGENT_ACTIVITY[nextStep.agent].active.replace(/…$/, "..."),
      });
      continue;
    }

    if (nextStep.status === "done" && nextStep.agent === "finish") {
      entries.push({
        time,
        agent: "Done",
        message: "Report generated successfully",
      });
      continue;
    }

    if (nextStep.status === "done") {
      entries.push({
        time,
        agent: label,
        message: AGENT_ACTIVITY[nextStep.agent].done,
      });
      continue;
    }

    if (nextStep.status === "error") {
      entries.push({
        time,
        agent: label,
        message: "Encountered an error",
      });
    }
  }

  return entries;
}

export function createCompletionLogEntry(): ActivityLogEntry {
  return {
    time: formatLogTime(),
    agent: "Done",
    message: "Report generated successfully",
  };
}

export function createErrorLogEntry(message: string): ActivityLogEntry {
  return {
    time: formatLogTime(),
    agent: "System",
    message,
  };
}

export interface BuildActivityLogOptions {
  error?: string | null;
  jobStatus?: JobStatus;
}

function withStaggeredTimes(
  entries: Omit<ActivityLogEntry, "time">[],
  baseTime = new Date(),
): ActivityLogEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    time: formatLogTime(new Date(baseTime.getTime() + (index + 1) * 1000)),
  }));
}

/** Reconstruct a terminal log from final pipeline steps (for history / reopened runs). */
export function buildActivityLogFromSteps(
  steps: PipelineStep[],
  options?: BuildActivityLogOptions,
): ActivityLogEntry[] {
  if (steps.every((step) => step.status === "idle")) {
    return [];
  }

  let current = IDLE_STEPS.map((step) => ({ ...step }));
  const rawEntries: Omit<ActivityLogEntry, "time">[] = [
    { agent: "Supervisor", message: "Planning research plan..." },
  ];

  for (let index = 0; index < steps.length; index += 1) {
    const finalStep = steps[index];
    if (finalStep.status === "idle") {
      continue;
    }

    const activeState = current.map((step, stepIndex) =>
      stepIndex === index ? { ...step, status: "active" as const } : step,
    );
    for (const entry of diffStepsToLogEntries(current, activeState)) {
      rawEntries.push({ agent: entry.agent, message: entry.message });
    }
    current = activeState;

    if (finalStep.status === "done" || finalStep.status === "error") {
      const doneState = current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, status: finalStep.status } : step,
      );
      for (const entry of diffStepsToLogEntries(current, doneState)) {
        rawEntries.push({ agent: entry.agent, message: entry.message });
      }
      current = doneState;
    }
  }

  const entries = withStaggeredTimes(rawEntries);

  if (options?.error) {
    entries.push({
      time: formatLogTime(new Date(Date.now() + (entries.length + 1) * 1000)),
      agent: "System",
      message: options.error,
    });
  }

  return entries;
}
