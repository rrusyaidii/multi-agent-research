"use client";

import { Clock3, FileText, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResearchHistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReportHistoryProps {
  reports: ResearchHistoryItem[];
  isLoading: boolean;
  activeThreadId: string | null;
  onOpen: (threadId: string) => void;
  onResume: (item: ResearchHistoryItem) => void;
}

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

export function ReportHistory({
  reports,
  isLoading,
  activeThreadId,
  onOpen,
  onResume,
}: ReportHistoryProps) {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Clock3 className="size-4 text-primary" aria-hidden />
              Recent reports
            </CardTitle>
            <CardDescription>Reopen reports saved by previous research runs.</CardDescription>
          </div>
          {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            No reports yet. Completed research runs will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((item) => (
              <li key={item.thread_id}>
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
                      {item.status === "failed" || item.status === "cancelled" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 px-2 text-xs"
                          onClick={() => onResume(item)}
                        >
                          Resume
                        </Button>
                      ) : null}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-muted text-[10px] text-muted-foreground"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
