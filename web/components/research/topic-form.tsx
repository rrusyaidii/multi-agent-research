"use client";

import { Loader2, Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EXAMPLE_TOPICS = [
  "AI agents market trends 2026",
  "Rust vs Go for backend",
  "Best frameworks for agentic AI",
] as const;

interface TopicFormProps {
  onSubmit: (topic: string) => void;
  onCancel?: () => void;
  isRunning: boolean;
  defaultTopic?: string;
}

export function TopicForm({
  onSubmit,
  onCancel,
  isRunning,
  defaultTopic = "",
}: TopicFormProps) {
  const [topic, setTopic] = useState(defaultTopic);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
  }

  return (
    <Card id="research" className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Research topic</CardTitle>
        <CardDescription>
          Enter a topic and the agent pipeline will search, analyze, and compile a report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="research-topic" className="text-sm font-medium">
              Topic
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="research-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. AI agents market trends 2026"
                className="h-11 pl-9"
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={!topic.trim() || isRunning}
              className="h-11 min-w-[140px] flex-1 bg-primary px-6 sm:flex-none"
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Researching…
                </>
              ) : (
                "Start research"
              )}
            </Button>
            {isRunning && onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-11 min-w-[100px]"
              >
                <X className="size-4" />
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_TOPICS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isRunning}
                onClick={() => setTopic(example)}
                className={cn(
                  "rounded-full border border-border bg-muted/50 px-3 py-1.5 text-left text-xs transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
