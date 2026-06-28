"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { checkHealth } from "@/lib/api";

export function SiteFooter() {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    checkHealth()
      .then(() => {
        if (!cancelled) {
          setApiConnected(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiConnected(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Multi-Agent Research
        </p>
        {apiConnected === true ? (
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-normal text-primary">
            Connected to API
          </Badge>
        ) : apiConnected === false ? (
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            API offline
          </Badge>
        ) : null}
      </div>
    </footer>
  );
}
