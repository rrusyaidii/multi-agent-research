"use client";

import { memo, useEffect, useRef } from "react";
import { Activity, CheckCircle2 } from "lucide-react";

import { SectionHeader } from "@/components/research/section-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { ActivityLogEntry } from "@/lib/activity-log";
import { cn } from "@/lib/utils";

interface ActivityPanelProps {
  activityLog: ActivityLogEntry[];
  isRunning: boolean;
}

export const ActivityPanel = memo(function ActivityPanel({ activityLog, isRunning }: ActivityPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current || activityLog.length === 0) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activityLog, isRunning]);

  return (
    <Card
      className={cn(
        "border border-border bg-card shadow-sm",
        isRunning && "card-accent-active",
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      <CardContent className="space-y-3 pt-6">
        <SectionHeader
          number={3}
          title="Live Activity"
          icon={Activity}
          trailing={
            isRunning ? (
              <span className="flex items-center gap-1.5 text-xs text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Live
              </span>
            ) : null
          }
        />

        <div
          ref={scrollRef}
          className="activity-terminal h-56 overflow-y-auto rounded-lg border border-border/60 bg-black/40 p-3 font-mono text-xs leading-relaxed"
        >
          {activityLog.length === 0 ? (
            <p className="text-muted-foreground">
              Activity will appear here when research starts.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {activityLog.map((entry, index) => (
                <li key={`${entry.time}-${entry.agent}-${index}`} className="flex gap-2">
                  <span className="shrink-0 text-emerald-400">{entry.time}</span>
                  <span className="text-foreground">
                    <span className="text-primary">{entry.agent}:</span>{" "}
                    {entry.message}
                    {entry.agent === "Done" && entry.message.includes("successfully") ? (
                      <CheckCircle2
                        className="ml-1 inline size-3 text-emerald-400"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
