---
name: email-parsing
description: How to safely parse and render email content (subject, body, attachments, threading) across MIME, HTML, and plain text. Use whenever you handle a message body, build a reply, sanitize HTML, or extract a thread.
---

# Skill — Email parsing & safe rendering

Email is a hostile format: nested MIME, weird encodings, malicious HTML, broken `Reply-To`, and Reply/Forward conventions vary by provider. This skill gives you the canonical patterns.

## Body extraction (server-side)

Use `mailparser`'s `simpleParser` on the raw RFC822 (from IMAP `download`) or use provider-native fields (Gmail/Microsoft already give you parsed parts).

```ts
import { simpleParser } from "mailparser";

const parsed = await simpleParser(rawRfc822);
// parsed.text — plain text
// parsed.html — HTML (string | false)
// parsed.subject, parsed.from, parsed.to, parsed.cc, parsed.date
// parsed.attachments — array of { filename, contentType, content (Buffer), size }
```

## Choosing a body to render
Preference order:
1. `parsed.html` after sanitization.
2. `parsed.text` rendered with line-breaks preserved.
3. Fallback: `"(no content)"`.

## HTML sanitization (mandatory)

All HTML email passes through `lib/sanitize.ts` (DOMPurify) before render:

```ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a","b","i","u","em","strong","p","br","hr","blockquote","pre","code",
      "ul","ol","li","div","span","h1","h2","h3","h4","h5","h6","table","thead","tbody",
      "tr","td","th","img","figure","figcaption",
    ],
    ALLOWED_ATTR: ["href","title","alt","src","style","width","height","colspan","rowspan","align"],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|cid:)/i,
    FORBID_TAGS: ["script","style","iframe","object","embed","form","input","button"],
    FORBID_ATTR: ["onerror","onload","onclick","onmouseover"],
  });
}
```

**Remote image policy** (anti-tracking):
- By default, replace `<img src="https://…">` with a placeholder and a "Load images" button.
- Lazy load only on user click.
- Inline `cid:` images may be allowed if the attachment is rendered server-side.

## Thread building (cross-provider)

Standard headers used: `Message-ID`, `In-Reply-To`, `References`.

Algorithm:
1. Each message has an `id` (Message-ID).
2. `In-Reply-To` → direct parent.
3. `References` (space-separated) → ancestry chain.
4. Build a forest keyed by Message-ID. Display in chronological order within a thread.

Gmail returns `threadId` natively — prefer it when present. Microsoft returns `conversationId`. IMAP doesn't have a native thread id; build it from headers.

## Building a Reply

```ts
function buildReplyHeaders(original: MessageDetail) {
  const references = [
    ...(original.references ?? []),
    original.messageId,
  ].filter(Boolean).join(" ");
  return {
    inReplyTo: original.messageId,
    references,
    subject: original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`,
  };
}
```

To `Reply All`:
- `to` = `original.replyTo ?? original.from`
- `cc` = unique union of `original.to ∪ original.cc`, minus the current user

## Building a Forward
- `subject` = `Fwd: …` if not already.
- Body includes a quoted block with `From: / To: / Date: / Subject:` preamble + original body.
- Re-attach the original attachments (download → re-upload).

## Subject normalization (for grouping / search)
Strip the leading `Re:`, `Fwd:`, `[Listname]` prefixes when comparing subjects for thread heuristics — but keep them in display.

## Address parsing
Use `mailparser`'s parsed `from.value[]` rather than splitting the raw header. Handle:
- `"Name" <email@x>` (RFC 5322)
- `email@x` only
- `=?utf-8?B?...?=` encoded names

## Quoting / trimming for AI
Before sending a thread to Claude (summarize/draft), strip:
- Quoted reply chains (lines starting with `>` or preceded by `On … wrote:`).
- Signatures (heuristic: trailing block separated by `-- \n` or repeated dashes).

Keep only the most-recent ~2 messages of context unless `summarize` requires more.

## Pitfalls
- `from` is a single object in some parsers; `to` is always an array.
- Subjects can be empty — never use them as a primary key.
- Some providers (Microsoft) HTML-escape entities; double-escape happens easily.
- Plain-text only emails should be wrapped in `<pre>` for rendering (preserve whitespace).

## Checklist
- [ ] HTML run through `lib/sanitize.ts`.
- [ ] Remote images blocked by default.
- [ ] Thread built from `In-Reply-To` + `References` (or native thread id).
- [ ] Reply / forward headers correct.
- [ ] Long quoted history stripped before AI calls.
