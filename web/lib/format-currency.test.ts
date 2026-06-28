import { describe, expect, it } from "vitest";

import { formatMYR } from "@/lib/format-currency";

describe("formatMYR", () => {
  it("formats amounts in Malaysian Ringgit", () => {
    expect(formatMYR(0.25)).toContain("0.25");
    expect(formatMYR(0.25)).toMatch(/RM/);
  });
});
