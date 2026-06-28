import { FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ReportViewerSkeleton() {
  return (
    <Card className="flex min-h-[420px] flex-col border border-border bg-card shadow-sm lg:min-h-[480px]">
      <CardHeader className="shrink-0 border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          <FileText className="size-5 shrink-0 text-primary" aria-hidden />
          Report
        </CardTitle>
        <CardDescription>Loading report viewer…</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-4">
        <div className="flex flex-1 flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
          <div className="h-6 w-2/3 animate-pulse rounded-md bg-muted" />
          <div className="space-y-3">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
