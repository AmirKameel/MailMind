import { describe, it, expect } from "vitest";
import { sanitizeEmailHtml } from "@/lib/sanitize";

describe("sanitizeEmailHtml", () => {
  it("strips script tags", () => {
    const out = sanitizeEmailHtml(`<p>hi</p><script>alert(1)</script>`);
    expect(out).not.toContain("<script>");
    expect(out).toContain("<p>hi</p>");
  });

  it("removes inline event handlers", () => {
    const out = sanitizeEmailHtml(`<img src="x" onerror="alert(1)">`);
    expect(out).not.toContain("onerror");
  });

  it("allows remote images by default", () => {
    const out = sanitizeEmailHtml(`<img src="https://example.com/a.png" alt="x">`);
    expect(out).toContain('src="https://example.com/a.png"');
    expect(out).not.toContain("data-blocked-src");
  });

  it("preserves protocol-relative image URLs", () => {
    const out = sanitizeEmailHtml(`<img src="//cdn.example.com/i.png" alt="x">`);
    expect(out).toContain('src="//cdn.example.com/i.png"');
  });

  it("blocks remote images when blockRemoteImages is true", () => {
    const out = sanitizeEmailHtml(`<img src="https://tracker.example/pixel.png">`, {
      blockRemoteImages: true,
    });
    expect(out).not.toMatch(/[\s>]src="https/);
    expect(out).toContain("data-blocked-src");
  });

  it("preserves safe links", () => {
    const out = sanitizeEmailHtml(`<a href="https://example.com">go</a>`);
    expect(out).toContain('href="https://example.com"');
  });
});
