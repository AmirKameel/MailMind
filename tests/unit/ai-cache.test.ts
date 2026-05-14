import { describe, it, expect } from "vitest";
import { cacheKeyHash } from "@/lib/ai/cache";

describe("cacheKeyHash", () => {
  it("produces the same hash regardless of key order", () => {
    const a = cacheKeyHash({ from: "a", to: "b", subject: "s" });
    const b = cacheKeyHash({ subject: "s", from: "a", to: "b" });
    expect(a).toBe(b);
  });

  it("differs when content differs", () => {
    expect(cacheKeyHash({ subject: "a" })).not.toBe(cacheKeyHash({ subject: "b" }));
  });

  it("recurses into nested objects + arrays", () => {
    const a = cacheKeyHash({ outer: { b: 1, a: 2 }, list: [1, 2] });
    const b = cacheKeyHash({ outer: { a: 2, b: 1 }, list: [1, 2] });
    expect(a).toBe(b);
  });
});
