import { describe, expect, it } from "vitest";

import {
  buildActivityLogFromSteps,
  createSeedLogEntry,
  diffStepsToLogEntries,
  formatLogTime,
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
