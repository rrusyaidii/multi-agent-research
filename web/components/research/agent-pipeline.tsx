"use client";

import { Check, Circle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStepActivityMessage } from "@/lib/agent-activity";
import { cn } from "@/lib/utils";
import type { AgentStatus, PipelineStep } from "@/lib/mock-data";

interface AgentPipelineProps {
  steps: PipelineStep[];
  isRunning: boolean;
}

function StepIcon({ status }: { status: AgentStatus }) {
  if (status === "done") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300 scale-100">
        <Check className="size-4" aria-hidden />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative flex size-8 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-primary pipeline-pulse-ring"
          aria-hidden
        />
        <span className="relative flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
          <Loader2 className="size-4 animate-spin" aria-hidden />
        </span>
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 text-destructive">
        <Circle className="size-3 fill-current" aria-hidden />
      </span>
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground">
      <Circle className="size-3" aria-hidden />
    </span>
  );
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "done":
      return "Complete";
    case "active":
      return "Running";
    case "error":
      return "Error";
    default:
      return "Waiting";
  }
}

function getLiveAnnouncement(steps: PipelineStep[], isRunning: boolean): string {
  if (!isRunning) {
    const allDone = steps.every((s) => s.status === "done");
    if (allDone && steps.length > 0) {
      return "Research complete. Report is ready.";
    }
    return "Pipeline idle. Start research to begin.";
  }

  const active = steps.find((s) => s.status === "active");
  if (active) {
    return `${active.label} agent is running.`;
  }

  return "Research in progress.";
}

export function AgentPipeline({ steps, isRunning }: AgentPipelineProps) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const total = steps.length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const liveMessage = getLiveAnnouncement(steps, isRunning);

  return (
    <Card id="pipeline" className="border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-xl">Agent pipeline</CardTitle>
            <CardDescription>
              Supervisor routes work across specialist agents.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {isRunning ? `${doneCount}/${total}` : `${total} agents`}
          </Badge>
        </div>

        {isRunning && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveMessage}
        </div>

        {/* Desktop: horizontal stepper */}
        <ol className="hidden md:flex md:items-start md:justify-between md:gap-2">
          {steps.map((step, index) => {
            const activityMessage = getStepActivityMessage(step.agent, step.status);
            const connectorDone = step.status === "done";

            return (
              <li
                key={step.agent}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-2",
                  step.status === "active" && "animate-in fade-in duration-300",
                )}
              >
                {index < steps.length - 1 && (
                  <span
                    className={cn(
                      "absolute top-4 left-[calc(50%+1rem)] h-0.5 w-[calc(100%-2rem)] -translate-y-1/2 overflow-hidden rounded-full bg-border",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "block h-full bg-primary transition-all duration-700 ease-out",
                        connectorDone ? "w-full" : "w-0",
                      )}
                    />
                  </span>
                )}
                <StepIcon status={step.status} />
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      step.status === "active" && "text-primary",
                      step.status === "done" && "text-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{statusLabel(step.status)}</p>
                  {activityMessage && (step.status === "active" || step.status === "done") && (
                    <p
                      className={cn(
                        "mt-1 max-w-[8rem] text-[10px] leading-tight text-muted-foreground",
                        step.status === "active" && "text-primary/80",
                      )}
                    >
                      {activityMessage}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Mobile: vertical stepper */}
        <ol className="flex flex-col gap-0 md:hidden">
          {steps.map((step, index) => {
            const activityMessage = getStepActivityMessage(step.agent, step.status);

            return (
              <li
                key={step.agent}
                className={cn(
                  "flex gap-3",
                  step.status === "active" && "animate-in fade-in duration-300",
                )}
              >
                <div className="flex flex-col items-center">
                  <StepIcon status={step.status} />
                  {index < steps.length - 1 && (
                    <span
                      className={cn(
                        "my-1 w-0.5 flex-1 min-h-6 transition-colors duration-700",
                        step.status === "done" ? "bg-primary" : "bg-border",
                      )}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="pb-6 pt-1">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      step.status === "active" && "text-primary",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{statusLabel(step.status)}</p>
                  {activityMessage && (step.status === "active" || step.status === "done") && (
                    <p
                      className={cn(
                        "mt-0.5 text-xs text-muted-foreground",
                        step.status === "active" && "text-primary/80",
                      )}
                    >
                      {activityMessage}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
