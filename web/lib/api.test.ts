import { afterEach, describe, expect, it, vi } from "vitest";

import { getResearchHistory, getResearchStatus, startResearch } from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api helpers", () => {
  it("starts a research job", async () => {
    const fetchMock = mockFetch({
      thread_id: "research-test",
      status: "running",
      topic: "AI agents",
    });

    const result = await startResearch("AI agents");

    expect(result.thread_id).toBe("research-test");
    expect(fetchMock).toHaveBeenCalledWith("/api/research", expect.objectContaining({
      method: "POST",
    }));
  });

  it("loads research status", async () => {
    mockFetch({
      thread_id: "research-test",
      topic: "AI agents",
      status: "completed",
      steps: [],
      report: "# Report",
      analysis: null,
      error: null,
      step_count: 4,
      max_steps: 30,
      session_cost: null,
      max_cost: 0.05,
      budget_exceeded: false,
    });

    const status = await getResearchStatus("research-test");

    expect(status.status).toBe("completed");
    expect(status.report).toBe("# Report");
  });

  it("loads history", async () => {
    mockFetch({ items: [{ thread_id: "research-test", topic: "AI", status: "completed" }] });

    const history = await getResearchHistory();

    expect(history.items).toHaveLength(1);
  });
});
