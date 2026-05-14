import { describe, it, expect } from "vitest";
import type { GaxiosResponse } from "gaxios";
import type { gmail_v1 } from "googleapis";

// Exercise the RFC822 builder indirectly through GmailProvider's private helper.
// We import via a tiny re-export trick to avoid leaking internals to the public surface.

import { GmailProvider } from "@/lib/providers/GmailProvider";

describe("GmailProvider RFC822 building (via buildRfc822 helper)", () => {
  it("constructs a minimal text email with correct headers", async () => {
    // Use a fake oauth2 client; we never call the network.
    const dummy = { setCredentials: () => undefined, on: () => undefined } as never;
    const p = new GmailProvider({
      accountId: "acc1",
      emailAddr: "me@example.com",
      oauth2: dummy,
    });

    // We monkey-patch the SDK call to capture the encoded `raw` value.
    let captured = "";
    const stubSend = async (params: { requestBody?: { raw?: string } }) => {
      const raw = params.requestBody?.raw ?? "";
      captured = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      return {
        data: { id: "msg-1" },
        config: {},
        status: 200,
        statusText: "OK",
        headers: {},
        request: { responseURL: "" },
      } as GaxiosResponse<gmail_v1.Schema$Message>;
    };
    Reflect.set(p, "gmail", {
      users: {
        messages: {
          // reason: googleapis `send` has streaming overloads; this test only exercises JSON send.
          send: stubSend as unknown as gmail_v1.Gmail["users"]["messages"]["send"],
        },
      },
    });

    const res = await p.sendMessage({
      to: [{ email: "alice@example.com", name: "Alice" }],
      subject: "Re: Hello",
      bodyText: "Hi Alice,\n\nThanks for the note.",
      inReplyTo: "<orig@example.com>",
      references: ["<orig@example.com>"],
    });

    expect(res.id).toBe("msg-1");
    expect(captured).toContain("From: me@example.com");
    expect(captured).toContain('To: "Alice" <alice@example.com>');
    expect(captured).toContain("Subject: Re: Hello");
    expect(captured).toContain("In-Reply-To: <orig@example.com>");
    expect(captured).toContain("References: <orig@example.com>");
    expect(captured).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(captured).toContain("Hi Alice,");
  });
});
