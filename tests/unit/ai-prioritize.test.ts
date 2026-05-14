import { describe, it, expect, beforeEach } from "vitest";

describe("ai/prioritize", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("returns 'normal' for every item when API key is missing", async () => {
    const { run } = await import("@/lib/ai/skills/prioritize");
    const items = Array.from({ length: 3 }, (_, i) => ({
      id: `m${i}`,
      subject: `subj ${i}`,
      from: "sender@example.com",
      snippet: "…",
      date: new Date().toISOString(),
    }));
    const out = await run({
      emailAccountId: "acc1",
      user: { email: "me@example.com" },
      items,
    });
    expect(out.results).toHaveLength(3);
    expect(out.results.every((r) => r.priority === "normal")).toBe(true);
  });

  it("returns empty results for empty input without calling the API", async () => {
    const { run } = await import("@/lib/ai/skills/prioritize");
    const out = await run({
      emailAccountId: "acc1",
      user: { email: "me@example.com" },
      items: [],
    });
    expect(out.results).toEqual([]);
  });
});
