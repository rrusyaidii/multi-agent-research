"use client";

import { memo } from "react";
import { Info } from "lucide-react";

import { formatMYR } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

interface BudgetFooterProps {
  isRunning: boolean;
  sessionCost: number | null;
  maxCost: number | null;
  budgetExceeded?: boolean;
  className?: string;
}

export const BudgetFooter = memo(function BudgetFooter({
  isRunning,
  sessionCost,
  maxCost,
  budgetExceeded = false,
  className,
}: BudgetFooterProps) {
  const hasCostData = sessionCost != null || maxCost != null;

  if (!isRunning && !hasCostData) {
    return null;
  }

  const costDisplay =
    sessionCost == null
      ? maxCost == null
        ? "Estimating…"
        : `Unknown / ${formatMYR(maxCost)}`
      : `${formatMYR(sessionCost)}${maxCost == null ? "" : ` / ${formatMYR(maxCost)}`}`;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>Estimated cost (MYR):</span>
        <Info className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </div>
      <div className="text-right">
        <span
          className={cn(
            "font-medium text-primary",
            budgetExceeded && "text-destructive",
          )}
        >
          {costDisplay}
        </span>
        {budgetExceeded ? (
          <p className="mt-0.5 text-xs text-destructive" role="alert">
            Budget exceeded
          </p>
        ) : null}
      </div>
    </div>
  );
});
