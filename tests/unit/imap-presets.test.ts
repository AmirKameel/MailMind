import { describe, it, expect } from "vitest";
import { presetFor } from "@/lib/providers/imap-presets";

describe("imap-presets", () => {
  it.each([
    ["alice@yahoo.com", "imap.mail.yahoo.com"],
    ["bob@aol.com", "imap.aol.com"],
    ["c@icloud.com", "imap.mail.me.com"],
    ["d@fastmail.com", "imap.fastmail.com"],
  ])("resolves %s to %s", (email, host) => {
    expect(presetFor(email)?.imapHost).toBe(host);
  });

  it("returns undefined for unknown domains", () => {
    expect(presetFor("user@example.org")).toBeUndefined();
  });

  it("is case-insensitive on the domain", () => {
    expect(presetFor("user@YAHOO.COM")?.imapHost).toBe("imap.mail.yahoo.com");
  });
});
