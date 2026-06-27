import type { AgentStep } from "@/lib/types";

export interface AgentActivity {
  active: string;
  done: string;
  variants: string[];
}

export const AGENT_ACTIVITY: Record<AgentStep, AgentActivity> = {
  supervisor: {
    active: "Routing the research plan…",
    done: "Plan ready",
    variants: [
      "Deciding which agent runs next…",
      "Reviewing pipeline progress…",
      "Coordinating specialist agents…",
    ],
  },
  search: {
    active: "Searching the web for sources…",
    done: "Sources collected",
    variants: [
      "Querying search engines…",
      "Gathering relevant pages…",
      "Collecting source material…",
    ],
  },
  analysis: {
    active: "Analyzing and synthesizing findings…",
    done: "Analysis complete",
    variants: [
      "Extracting key themes…",
      "Identifying patterns across sources…",
      "Building structured insights…",
    ],
  },
  writer: {
    active: "Writing your report…",
    done: "Report drafted",
    variants: [
      "Drafting executive summary…",
      "Organizing key findings…",
      "Polishing final recommendations…",
    ],
  },
  finish: {
    active: "Finalizing…",
    done: "Done",
    variants: [
      "Wrapping up research session…",
      "Saving report to disk…",
    ],
  },
};

export function getStepActivityMessage(
  agent: AgentStep,
  status: "idle" | "active" | "done" | "error",
): string | null {
  if (status === "idle") {
    return null;
  }
  const activity = AGENT_ACTIVITY[agent];
  if (status === "done") {
    return activity.done;
  }
  if (status === "active") {
    return activity.active;
  }
  return "Something went wrong";
}

export function getActiveAgent(steps: { agent: AgentStep; status: string }[]): AgentStep | null {
  const active = steps.find((step) => step.status === "active");
  return active?.agent ?? null;
}
