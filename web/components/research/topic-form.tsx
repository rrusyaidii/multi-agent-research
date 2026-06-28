"use client";

import { Loader2, Play, X, FileEdit } from "lucide-react";
import { memo, useState } from "react";

import { SectionHeader } from "@/components/research/section-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TOPIC_MIN_LENGTH = 3;
const TOPIC_MAX_LENGTH = 500;

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

export const TopicForm = memo(function TopicForm({
  onSubmit,
  onCancel,
  isRunning,
  defaultTopic = "",
}: TopicFormProps) {
  const [topic, setTopic] = useState(defaultTopic);
  const trimmedTopic = topic.trim();
  const topicLength = trimmedTopic.length;
  const validationMessage =
    topicLength === 0
      ? null
      : topicLength < TOPIC_MIN_LENGTH
        ? `Topic must be at least ${TOPIC_MIN_LENGTH} characters.`
        : topicLength > TOPIC_MAX_LENGTH
          ? `Topic must be ${TOPIC_MAX_LENGTH} characters or fewer.`
          : null;
  const canSubmit = topicLength >= TOPIC_MIN_LENGTH && topicLength <= TOPIC_MAX_LENGTH;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isRunning) return;
    onSubmit(trimmedTopic);
  }

  return (
    <Card
      id="research"
      className={cn(
        "border border-border bg-card shadow-sm",
        isRunning && "card-accent-active",
      )}
    >
      <CardContent className="space-y-4 pt-6">
        <SectionHeader number={1} title="Research Topic" icon={FileEdit} />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                id="research-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. VPS hosting providers in Malaysia 2026. Compare pricing, RAM, storage, bandwidth and key features."
                className="min-h-28 resize-y bg-background/50"
                disabled={isRunning}
                maxLength={TOPIC_MAX_LENGTH + 50}
                aria-invalid={Boolean(validationMessage)}
                aria-describedby="research-topic-help research-topic-count"
              />
              <p
                id="research-topic-count"
                className={cn(
                  "pointer-events-none absolute right-3 bottom-2 text-xs text-muted-foreground",
                  topicLength > TOPIC_MAX_LENGTH && "text-destructive",
                )}
              >
                {topicLength} / {TOPIC_MAX_LENGTH}
              </p>
            </div>
            {validationMessage ? (
              <p
                id="research-topic-help"
                className="text-xs text-destructive"
              >
                {validationMessage}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={!canSubmit || isRunning}
              className="h-11 w-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Researching…
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  Start research
                </>
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
                aria-pressed={topic === example}
                className={cn(
                  "rounded-full border border-border bg-muted/50 px-3 py-1.5 text-left text-xs transition-colors",
                  "hover:border-primary/60 hover:bg-primary/10 hover:text-foreground",
                  topic === example && "border-primary/70 bg-primary/10 text-foreground",
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
});
