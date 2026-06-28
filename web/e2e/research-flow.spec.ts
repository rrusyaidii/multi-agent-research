import { expect, test } from "@playwright/test";

test("research flow renders a mocked report", async ({ page }) => {
  let statusCalls = 0;

  await page.route("**/api/research", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        json: {
          thread_id: "research-e2e",
          status: "running",
          topic: "AI agents market trends 2026",
        },
      });
      return;
    }

    await route.fulfill({
      json: {
        items: [],
      },
    });
  });

  await page.route("**/api/status/research-e2e", async (route) => {
    statusCalls += 1;
    await route.fulfill({
      json: {
        thread_id: "research-e2e",
        topic: "AI agents market trends 2026",
        status: statusCalls > 1 ? "completed" : "running",
        steps: [
          { agent: "supervisor", status: "done", label: "Supervisor" },
          { agent: "search", status: "done", label: "Search" },
          { agent: "analysis", status: statusCalls > 1 ? "done" : "active", label: "Analysis" },
          { agent: "writer", status: statusCalls > 1 ? "done" : "idle", label: "Writer" },
          { agent: "finish", status: statusCalls > 1 ? "done" : "idle", label: "Done" },
        ],
        report: statusCalls > 1 ? "# AI Agents Report\n\n## Summary\n\nMocked report." : null,
        analysis: "Mocked analysis",
        error: null,
        step_count: 3,
        max_steps: 30,
        session_cost: null,
        max_cost: 0.05,
        budget_exceeded: false,
      },
    });
  });

  await page.route("**/api/research/research-e2e/stream", async (route) => {
    await route.abort();
  });

  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });

  await page.goto("/");
  await page.getByLabel("Topic").fill("AI agents market trends 2026");
  await page.getByRole("button", { name: "Start research" }).click();

  await expect(page.getByRole("heading", { name: "AI Agents Report" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
});
