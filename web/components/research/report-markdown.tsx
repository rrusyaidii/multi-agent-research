"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mb-4 border-b border-primary/30 pb-3 font-serif text-2xl font-semibold tracking-tight text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-6 mb-3 font-serif text-lg font-semibold text-primary">
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

function formatReportDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

interface ReportMarkdownProps {
  report: string;
}

export function ReportMarkdown({ report }: ReportMarkdownProps) {
  return (
    <article
      className={cn(
        "report-prose p-5 sm:p-6",
        "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
      tabIndex={-1}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {report}
      </ReactMarkdown>
      <p className="mt-8 border-t border-border/60 pt-4 text-xs italic text-muted-foreground">
        Report generated on {formatReportDate()} by Multi-Agent Research
      </p>
    </article>
  );
}
