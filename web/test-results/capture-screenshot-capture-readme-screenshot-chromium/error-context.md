# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capture-screenshot.spec.ts >> capture readme screenshot
- Location: e2e\capture-screenshot.spec.ts:4:5

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  getByRole('button', { name: 'Start research' })
Expected: enabled
Received: disabled
Timeout:  10000ms

Call log:
  - Expect "toBeEnabled" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Start research' })
    23 × locator resolved to <button disabled tabindex="0" type="submit" data-disabled="" data-slot="button" class="group/button inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-…>Start research</button>
       - unexpected value "disabled"

```

```yaml
- button "Start research" [disabled]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import path from "node:path";
  3  | 
  4  | test("capture readme screenshot", async ({ page }) => {
  5  |   test.setTimeout(60_000);
  6  |   await page.route("**/api/research", async (route) => {
  7  |     if (route.request().method() === "POST") {
  8  |       await route.fulfill({
  9  |         json: {
  10 |           thread_id: "research-screenshot",
  11 |           status: "running",
  12 |           topic: "VPS hosting Malaysia 2026",
  13 |         },
  14 |       });
  15 |       return;
  16 |     }
  17 | 
  18 |     await route.fulfill({ json: { items: [] } });
  19 |   });
  20 | 
  21 |   await page.route("**/api/status/research-screenshot", async (route) => {
  22 |     await route.fulfill({
  23 |       json: {
  24 |         thread_id: "research-screenshot",
  25 |         topic: "VPS hosting Malaysia 2026",
  26 |         status: "completed",
  27 |         steps: [
  28 |           { agent: "supervisor", status: "done", label: "Supervisor" },
  29 |           { agent: "search", status: "done", label: "Search" },
  30 |           { agent: "analysis", status: "done", label: "Analysis" },
  31 |           { agent: "writer", status: "done", label: "Writer" },
  32 |           { agent: "finish", status: "done", label: "Done" },
  33 |         ],
  34 |         report: [
  35 |           "# VPS Hosting Malaysia 2026",
  36 |           "",
  37 |           "## Executive Summary",
  38 |           "",
  39 |           "Comparison of leading Malaysian VPS providers with pricing in **RM**.",
  40 |           "",
  41 |           "## Comparison",
  42 |           "",
  43 |           "| Provider | Price (RM/mo) | RAM | Best for |",
  44 |           "|----------|---------------|-----|----------|",
  45 |           "| Shinjiru | RM 13.90 | 1GB | Budget unlimited transfer |",
  46 |           "| VPS Malaysia | RM 15.90 | 1GB | NVMe + warranty |",
  47 |           "| Exabytes | RM 45 | 4GB | More RAM/storage |",
  48 |           "",
  49 |           "## Recommendations",
  50 |           "",
  51 |           "- **Budget:** Shinjiru for lowest long-term price",
  52 |           "- **Balance:** VPS Malaysia for hardware quality",
  53 |         ].join("\n"),
  54 |         analysis: "Three providers compared on price, RAM, and support.",
  55 |         error: null,
  56 |         step_count: 8,
  57 |         max_steps: 30,
  58 |         session_cost: 0.08,
  59 |         max_cost: 0.25,
  60 |         budget_exceeded: false,
  61 |       },
  62 |     });
  63 |   });
  64 | 
  65 |   await page.route("**/api/research/research-screenshot/stream", async (route) => {
  66 |     await route.abort();
  67 |   });
  68 | 
  69 |   await page.route("**/api/health", async (route) => {
  70 |     await route.fulfill({ json: { status: "ok" } });
  71 |   });
  72 | 
  73 |   await page.setViewportSize({ width: 1280, height: 800 });
  74 |   await page.goto("/");
  75 |   await page.waitForSelector("#research-topic");
  76 |   await page.locator("#research-topic").evaluate((el, value) => {
  77 |     const setter = Object.getOwnPropertyDescriptor(
  78 |       window.HTMLTextAreaElement.prototype,
  79 |       "value",
  80 |     )?.set;
  81 |     setter?.call(el, value);
  82 |     el.dispatchEvent(new Event("input", { bubbles: true }));
  83 |   }, "VPS hosting Malaysia 2026 comparison");
> 84 |   await expect(page.getByRole("button", { name: "Start research" })).toBeEnabled({ timeout: 10_000 });
     |                                                                      ^ Error: expect(locator).toBeEnabled() failed
  85 |   await page.getByRole("button", { name: "Start research" }).click();
  86 |   await expect(page.getByRole("heading", { name: "VPS Hosting Malaysia 2026" })).toBeVisible();
  87 |   await expect(page.getByRole("button", { name: /PDF/i })).toBeVisible();
  88 | 
  89 |   const outputPath = path.resolve(__dirname, "../../docs/screenshots/app-dark-report.png");
  90 |   await page.screenshot({ path: outputPath, fullPage: false });
  91 | });
  92 | 
```