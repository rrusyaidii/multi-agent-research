import { describe, expect, it, vi } from "vitest";

import {
  buildActivityLogFromSteps,
  createSeedLogEntry,
  diffStepsToLogEntries,
  filterNovelLogEntries,
  formatLogTime,
  stepsEqual,
} from "@/lib/activity-log";
import { buildCompletedSession, IDLE_STEPS } from "@/lib/mock-data";

describe("activity-log", () => {
  it("formats log time in 24-hour format", () => {
    const time = formatLogTime(new Date("2026-05-24T15:42:01"));
    expect(time).toMatch(/15:42:01/);
  });

  it("creates a supervisor seed entry", () => {
    const entry = createSeedLogEntry();
    expect(entry.agent).toBe("Supervisor");
    expect(entry.message).toContain("Planning");
  });

  it("diffs step transitions into log entries", () => {
    const prev = IDLE_STEPS;
    const next = IDLE_STEPS.map((step, index) =>
      index === 0 ? { ...step, status: "active" as const } : step,
    );

    const entries = diffStepsToLogEntries(prev, next);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.agent).toBe("Supervisor");
  });

  it("idle to done emits active and done messages", () => {
    const prev = IDLE_STEPS;
    const next = IDLE_STEPS.map((step, index) =>
      index === 1 ? { ...step, status: "done" as const } : step,
    );

    const entries = diffStepsToLogEntries(prev, next);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.agent).toBe("Search");
    expect(entries[0]?.message).toContain("Searching");
    expect(entries[1]?.message).toBe("Sources collected");
  });

  it("assigns distinct timestamps per entry in a multi-transition diff", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T15:42:00"));

    try {
      const prev = IDLE_STEPS;
      const next = IDLE_STEPS.map((step, index) => {
        if (index === 0) {
          return { ...step, status: "done" as const };
        }
        if (index === 1) {
          return { ...step, status: "done" as const };
        }
        return step;
      });

      const entries = diffStepsToLogEntries(prev, next);
      expect(entries.length).toBeGreaterThan(2);
      const times = new Set(entries.map((entry) => entry.time));
      expect(times.size).toBe(entries.length);
    } finally {
      vi.useRealTimers();
    }
  });

  it("compares pipeline steps by agent and status", () => {
    const a = IDLE_STEPS;
    const b = IDLE_STEPS.map((step, index) =>
      index === 0 ? { ...step, status: "active" as const } : step,
    );
    expect(stepsEqual(a, a)).toBe(true);
    expect(stepsEqual(a, b)).toBe(false);
  });

  it("filters consecutive duplicate log entries", () => {
    const prev = [{ time: "12:00:00", agent: "Search", message: "Sources collected" }];
    const entries = [
      { time: "12:00:01", agent: "Search", message: "Sources collected" },
      { time: "12:00:02", agent: "Analysis", message: "Analyzing and synthesizing findings..." },
    ];
    expect(filterNovelLogEntries(prev, entries)).toHaveLength(1);
    expect(filterNovelLogEntries(prev, entries)[0]?.agent).toBe("Analysis");
  });

  it("builds log from a completed five-step run", () => {
    const { steps } = buildCompletedSession("VPS hosting Malaysia 2026");
    const log = buildActivityLogFromSteps(steps);

    expect(log.length).toBeGreaterThan(1);
    expect(log[0]?.agent).toBe("Supervisor");
    expect(log.some((entry) => entry.agent === "Done")).toBe(true);
    expect(log.every((entry) => entry.time.length > 0)).toBe(true);
  });

  it("appends system error when rebuilding failed runs", () => {
    const failedSteps = IDLE_STEPS.map((step, index) =>
      index < 2 ? { ...step, status: "done" as const } : index === 2
        ? { ...step, status: "error" as const }
        : step,
    );

    const log = buildActivityLogFromSteps(failedSteps, {
      error: "Research failed.",
      jobStatus: "failed",
    });

    expect(log.some((entry) => entry.agent === "System" && entry.message === "Research failed.")).toBe(true);
  });
});
