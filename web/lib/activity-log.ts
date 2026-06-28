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

export function stepsEqual(prev: PipelineStep[], next: PipelineStep[]): boolean {
  if (prev.length !== next.length) {
    return false;
  }
  return prev.every(
    (step, index) =>
      step.agent === next[index]?.agent && step.status === next[index]?.status,
  );
}

function activeMessage(agent: AgentStep): string {
  return AGENT_ACTIVITY[agent].active.replace(/…$/, "...");
}

function doneMessage(agent: AgentStep): string {
  if (agent === "finish") {
    return "Report generated successfully";
  }
  return AGENT_ACTIVITY[agent].done;
}

function pushLogEntry(
  entries: ActivityLogEntry[],
  agent: string,
  message: string,
  tick: number,
): number {
  entries.push({
    time: formatLogTime(new Date(Date.now() + tick * 1000)),
    agent,
    message,
  });
  return tick + 1;
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
  let tick = 0;

  for (let index = 0; index < next.length; index += 1) {
    const prevStep = prev[index];
    const nextStep = next[index];
    if (!prevStep || prevStep.status === nextStep.status) {
      continue;
    }

    const label = AGENT_LABELS[nextStep.agent];

    if (prevStep.status === "idle" && nextStep.status === "done") {
      tick = pushLogEntry(entries, label, activeMessage(nextStep.agent), tick);
      if (nextStep.agent === "finish") {
        tick = pushLogEntry(entries, "Done", doneMessage("finish"), tick);
      } else {
        tick = pushLogEntry(entries, label, doneMessage(nextStep.agent), tick);
      }
      continue;
    }

    if (nextStep.status === "active") {
      tick = pushLogEntry(entries, label, activeMessage(nextStep.agent), tick);
      continue;
    }

    if (nextStep.status === "done" && nextStep.agent === "finish") {
      tick = pushLogEntry(entries, "Done", doneMessage("finish"), tick);
      continue;
    }

    if (nextStep.status === "done") {
      tick = pushLogEntry(entries, label, doneMessage(nextStep.agent), tick);
      continue;
    }

    if (nextStep.status === "error") {
      tick = pushLogEntry(entries, label, "Encountered an error", tick);
    }
  }

  return entries;
}

export function filterNovelLogEntries(
  prev: ActivityLogEntry[],
  entries: ActivityLogEntry[],
): ActivityLogEntry[] {
  const novel: ActivityLogEntry[] = [];
  let lastKey =
    prev.length > 0
      ? `${prev[prev.length - 1].agent}:${prev[prev.length - 1].message}`
      : "";

  for (const entry of entries) {
    const key = `${entry.agent}:${entry.message}`;
    if (key === lastKey) {
      continue;
    }
    novel.push(entry);
    lastKey = key;
  }

  return novel;
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
