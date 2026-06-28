"use client";

import { memo, useState } from "react";
import { Download, FileText, Loader2, Check } from "lucide-react";

import { ReportMarkdown } from "@/components/research/report-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { downloadReportPdf, slugifyReportFilename } from "@/lib/export-pdf";
import { cn } from "@/lib/utils";

interface ReportViewerProps {
  report: string | null;
  topic: string | null;
  isRunning: boolean;
}

function ReportGeneratingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
      <div className="h-6 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
      </div>
      <p className="mt-auto text-center text-xs text-muted-foreground">
        Agents are compiling your report…
      </p>
    </div>
  );
}

export const ReportViewer = memo(function ReportViewer({
  report,
  topic,
  isRunning,
}: ReportViewerProps) {
  const hasReport = Boolean(report);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleDownloadPdf() {
    if (!report || !hasReport) {
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const filename = slugifyReportFilename(topic ?? "research-report");
      await downloadReportPdf(report, topic ?? "Research Report", `${filename}.pdf`);
    } catch {
      setExportError("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card
      id="report"
      className={cn(
        "flex flex-col border border-border bg-card shadow-sm",
        hasReport
          ? "h-[min(70dvh,calc(100dvh-10rem))] min-h-[420px] overflow-hidden lg:h-full"
          : "min-h-[420px] lg:min-h-[480px]",
        hasReport && "card-accent-active",
      )}
    >
      <CardHeader className="shrink-0 space-y-2 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 font-serif text-xl">
            <FileText className="size-5 shrink-0 text-primary" aria-hidden />
            Report
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {hasReport && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownloadPdf()}
                  disabled={isExporting}
                  className="h-8 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      <span className="hidden sm:inline">Exporting…</span>
                    </>
                  ) : (
                    <>
                      <Download className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">Download PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </>
                  )}
                </Button>
                <Badge
                  variant="outline"
                  className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Check className="mr-1 size-3" aria-hidden />
                  Ready
                </Badge>
              </>
            )}
            {isRunning && !hasReport && (
              <Badge variant="secondary" className="animate-pulse bg-muted">
                Generating…
              </Badge>
            )}
          </div>
        </div>
        {topic ? (
          <CardDescription
            className="line-clamp-2 text-left"
            title={topic}
          >
            {topic}
          </CardDescription>
        ) : (
          <CardDescription>Your compiled report will appear here.</CardDescription>
        )}
        {exportError ? (
          <p className="text-xs text-destructive" role="alert">
            {exportError}
          </p>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-1 flex-col",
          hasReport && "min-h-0 overflow-hidden pt-4",
        )}
      >
        {isRunning && !hasReport ? (
          <div className="flex min-h-[280px] w-full flex-1 flex-col">
            <ReportGeneratingSkeleton />
          </div>
        ) : !hasReport ? (
          <div className="flex min-h-[280px] w-full flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <FileText className="mb-3 size-10 text-muted-foreground/50" aria-hidden />
            <p className="text-sm font-medium">No report yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Submit a research topic to generate a structured markdown report.
            </p>
          </div>
        ) : (
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border bg-muted/30"
            aria-label="Generated research report"
          >
            <ReportMarkdown report={report!} />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
