"use client";

import { memo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { ResearchHistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReportHistoryProps {
  reports: ResearchHistoryItem[];
  isLoading: boolean;
  activeThreadId: string | null;
  deletingId: string | null;
  isClearing: boolean;
  onOpen: (threadId: string) => void;
  onResume: (item: ResearchHistoryItem) => void;
  onDelete: (threadId: string) => void;
  onClearAll: () => void;
}

const STALE_RUNNING_MS = 30_000;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function canResumeJob(item: ResearchHistoryItem): boolean {
  if (item.status === "failed" || item.status === "cancelled") {
    return true;
  }
  if (item.status !== "running") {
    return false;
  }
  const updatedAt = new Date(item.updated_at).getTime();
  if (Number.isNaN(updatedAt)) {
    return true;
  }
  return Date.now() - updatedAt > STALE_RUNNING_MS;
}

interface HistoryRowProps {
  item: ResearchHistoryItem;
  activeThreadId: string | null;
  deletingId: string | null;
  onOpen: (threadId: string) => void;
  onResume: (item: ResearchHistoryItem) => void;
  onDelete: (threadId: string) => void;
}

const HistoryRow = memo(function HistoryRow({
  item,
  activeThreadId,
  deletingId,
  onOpen,
  onResume,
  onDelete,
}: HistoryRowProps) {
  const isRunning = item.status === "running";
  const isDeleting = deletingId === item.thread_id;

  return (
    <li>
      <div
        className={cn(
          "rounded-md border border-transparent p-3",
          activeThreadId === item.thread_id && "border-primary/40 bg-primary/10",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="line-clamp-2 text-left text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onOpen(item.thread_id)}
            >
              {item.topic}
            </button>
            <span className="mt-1 block text-xs text-muted-foreground">
              {formatDate(item.updated_at)}
            </span>
            {canResumeJob(item) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 px-2 text-xs"
                onClick={() => onResume(item)}
              >
                {item.status === "running" ? "Resume interrupted" : "Resume"}
              </Button>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge
              variant="secondary"
              className="bg-muted text-[10px] text-muted-foreground"
            >
              {item.status}
            </Badge>
            {!isRunning ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-destructive"
                aria-label={`Delete report: ${item.topic}`}
                disabled={isDeleting}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item.thread_id);
                }}
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <X className="size-3.5" aria-hidden />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
});

export const ReportHistory = memo(function ReportHistory({
  reports,
  isLoading,
  activeThreadId,
  deletingId,
  isClearing,
  onOpen,
  onResume,
  onDelete,
  onClearAll,
}: ReportHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border border-border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="report-history-panel"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          )}
          <Clock3 className="size-4 text-primary" aria-hidden />
          <span className="text-sm font-medium text-foreground">Report history</span>
          {!isExpanded && reports.length > 0 ? (
            <Badge
              variant="secondary"
              className="bg-muted text-[10px] text-muted-foreground"
            >
              {reports.length}
            </Badge>
          ) : null}
        </div>
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </button>

      <div
        id="report-history-panel"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="border-t border-border/60 pt-4">
            {isExpanded && reports.length > 0 ? (
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  disabled={isClearing}
                  onClick={onClearAll}
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Clearing…
                    </>
                  ) : (
                    "Clear all"
                  )}
                </Button>
              </div>
            ) : null}
            {reports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                No reports yet. Completed research runs will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {reports.map((item) => (
                  <HistoryRow
                    key={item.thread_id}
                    item={item}
                    activeThreadId={activeThreadId}
                    deletingId={deletingId}
                    onOpen={onOpen}
                    onResume={onResume}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
});
