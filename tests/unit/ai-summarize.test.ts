import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("ai/summarize fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
  });

  it("returns degraded fallback when OPENAI_API_KEY is unset", async () => {
    const { run, fallback } = await import("@/lib/ai/skills/summarize");
    const out = await run({
      emailAccountId: "acc1",
      messageId: "m1",
      subject: "Hello",
      from: "Alice <alice@example.com>",
      date: new Date().toISOString(),
      bodyText: "Quick check-in.",
      attachments: [],
    });
    expect(out.degraded).toBe(true);
    expect(out.summary.length).toBeGreaterThan(0);

    const fb = fallback({
      emailAccountId: "acc1",
      messageId: "m1",
      subject: "Hello",
      from: "alice@example.com",
      date: new Date().toISOString(),
      bodyText: "Hi",
      attachments: [],
    });
    expect(fb.category).toBe("other");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });
});
