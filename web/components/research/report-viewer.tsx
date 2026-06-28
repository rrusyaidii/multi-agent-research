"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function ReportSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
      <div className="h-6 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-2 space-y-3">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
      <p className="mt-auto text-center text-xs text-muted-foreground">
        Agents are compiling your report…
      </p>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mb-4 font-serif text-2xl font-semibold tracking-tight text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-6 mb-3 border-l-2 border-primary pl-3 font-serif text-lg font-semibold text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-4 mb-2 text-base font-semibold text-foreground/90">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-2 ml-4 list-disc space-y-2">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-2 ml-4 list-decimal space-y-2">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="text-sm leading-relaxed text-muted-foreground">{children}</li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-6 border-border" />,
  em: ({ children }: { children?: ReactNode }) => (
    <em className="text-xs italic text-muted-foreground">{children}</em>
  ),
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-4 border-l-2 border-primary/60 bg-muted/40 py-2 pr-3 pl-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-primary/10 text-foreground">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border-b border-r border-border px-3 py-2 align-top font-semibold last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border-b border-r border-border px-3 py-2 align-top text-muted-foreground last:border-r-0">
      {children}
    </td>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-foreground">
      {children}
    </pre>
  ),
};

export function ReportViewer({ report, topic, isRunning }: ReportViewerProps) {
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
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
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
            <ReportSkeleton />
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
            <article
              className={cn(
                "report-prose p-5 sm:p-6",
                "animate-in fade-in slide-in-from-bottom-2 duration-500",
              )}
              tabIndex={-1}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {report!}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
