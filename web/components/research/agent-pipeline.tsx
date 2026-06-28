"use client";

import {
  BarChart3,
  Check,
  CheckCircle2,
  Crown,
  GitBranch,
  Loader2,
  PenLine,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionHeader } from "@/components/research/section-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { getStepActivityMessage } from "@/lib/agent-activity";
import { cn } from "@/lib/utils";
import type { AgentStatus, AgentStep, PipelineStep } from "@/lib/mock-data";

interface AgentPipelineProps {
  steps: PipelineStep[];
  isRunning: boolean;
  hasReport?: boolean;
}

const AGENT_ICONS: Record<AgentStep, LucideIcon> = {
  supervisor: Crown,
  search: Search,
  analysis: BarChart3,
  writer: PenLine,
  finish: CheckCircle2,
};

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "done":
      return "Complete";
    case "active":
      return "Running";
    case "error":
      return "Error";
    default:
      return "Pending";
  }
}

function statusBadgeClass(status: AgentStatus): string {
  switch (status) {
    case "done":
      return "border-primary/50 bg-transparent text-primary";
    case "active":
      return "border-primary bg-primary/10 text-primary animate-pulse";
    case "error":
      return "border-destructive/50 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function StepRailIcon({
  status,
  agent,
}: {
  status: AgentStatus;
  agent: AgentStep;
}) {
  const Icon = AGENT_ICONS[agent];

  if (status === "done") {
    return (
      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-4" aria-hidden />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
        <Loader2 className="size-4 animate-spin" aria-hidden />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 text-destructive">
        <Icon className="size-4" aria-hidden />
      </span>
    );
  }

  return (
    <span className="relative z-10 flex size-8 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function getLiveAnnouncement(
  steps: PipelineStep[],
  isRunning: boolean,
  hasReport: boolean,
): string {
  if (!isRunning) {
    const allDone = steps.every((step) => step.status === "done");
    if (allDone && steps.length > 0) {
      return "Research complete. Report is ready.";
    }
    return "Pipeline idle. Start research to begin.";
  }

  const active = steps.find((step) => step.status === "active");
  if (active) {
    return `${active.label} agent is running.`;
  }

  if (hasReport) {
    return "Finalizing report…";
  }

  return "Research in progress.";
}

export function AgentPipeline({ steps, isRunning, hasReport = false }: AgentPipelineProps) {
  const liveMessage = getLiveAnnouncement(steps, isRunning, hasReport);

  return (
    <Card
      id="pipeline"
      className={cn(
        "border border-border bg-card shadow-sm",
        isRunning && "card-accent-active",
      )}
    >
      <CardContent className="space-y-4 pt-6">
        <SectionHeader number={2} title="Agent Pipeline" icon={GitBranch} />

        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveMessage}
        </div>

        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const activityMessage = getStepActivityMessage(step.agent, step.status);
            const isLast = index === steps.length - 1;
            const connectorDone = step.status === "done";

            return (
              <li
                key={step.agent}
                className={cn(
                  "flex gap-3",
                  step.status === "active" && "animate-in fade-in duration-300",
                )}
                aria-current={step.status === "active" ? "step" : undefined}
              >
                <div className="flex flex-col items-center">
                  <StepRailIcon status={step.status} agent={step.agent} />
                  {!isLast && (
                    <span
                      className={cn(
                        "my-1 w-0.5 min-h-8 flex-1 transition-colors duration-500",
                        connectorDone ? "bg-primary" : "bg-border",
                      )}
                      aria-hidden
                    />
                  )}
                </div>

                <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                  <div className="flex items-start justify-between gap-2 pt-0.5">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium transition-colors duration-300",
                          step.status === "active" && "text-primary",
                          step.status === "done" && "text-foreground",
                        )}
                      >
                        {step.label}
                      </p>
                      {activityMessage && (step.status === "active" || step.status === "done") ? (
                        <p
                          className={cn(
                            "mt-0.5 text-xs text-muted-foreground",
                            step.status === "active" && "text-primary/80",
                          )}
                        >
                          {activityMessage}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px] font-medium",
                        statusBadgeClass(step.status),
                      )}
                    >
                      {statusLabel(step.status)}
                    </Badge>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
