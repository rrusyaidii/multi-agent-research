"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AGENT_ACTIVITY, getActiveAgent } from "@/lib/agent-activity";
import type { PipelineStep } from "@/lib/types";

interface ActivityPanelProps {
  steps: PipelineStep[];
  analysis: string | null;
  isRunning: boolean;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-primary animate-typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

export function ActivityPanel({ steps, analysis, isRunning }: ActivityPanelProps) {
  const activeAgent = getActiveAgent(steps);
  const [variantIndex, setVariantIndex] = useState(0);

  useEffect(() => {
    if (!isRunning || !activeAgent) {
      return;
    }
    setVariantIndex(0);
    const interval = setInterval(() => {
      setVariantIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeAgent, isRunning]);

  if (!isRunning) {
    return null;
  }

  const activity = activeAgent ? AGENT_ACTIVITY[activeAgent] : null;
  const variantCount = activity?.variants.length ?? 0;
  const subMessage = activity && variantCount > 0
    ? activity.variants[variantIndex % variantCount]
    : "Research in progress…";

  const analysisPreview = analysis?.trim();
  const truncatedAnalysis = analysisPreview
    ? analysisPreview.length > 280
      ? `${analysisPreview.slice(0, 277)}…`
      : analysisPreview
    : null;

  return (
    <Card className="border-primary/20 bg-primary/[0.03] shadow-sm animate-in fade-in duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary animate-pulse" aria-hidden />
          Live activity
          <TypingDots />
        </CardTitle>
        <CardDescription>
          {activity?.active ?? "Starting research pipeline…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p
          key={subMessage}
          className="text-sm text-muted-foreground animate-in fade-in duration-300"
        >
          {subMessage}
        </p>

        {truncatedAnalysis ? (
          <div className="rounded-lg border border-border/60 bg-background/80 p-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-primary">
              Analysis preview
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {truncatedAnalysis}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
            <div className="space-y-2">
              <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-4/6 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
