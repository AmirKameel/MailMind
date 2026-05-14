# Spec 006 — AI Summaries

## 1. Goal
Generate a concise, structured summary of any email message on demand, cache it durably, and render it as a card in the message view.

## 2. Non-goals
- Whole-thread summaries (v2).
- Multi-language summaries beyond the source language (v2).

## 3. User stories
- As a user opening a long email, I see a 2-sentence summary + 3 bullets describing what's in it within 2 s.
- As a user, returning to the same email later, the summary loads instantly (cached).

## 4. Surface
- API: `POST /api/ai/summarize` — `{ accountId, messageId }` → returns cached or generates.
- Component: `<SummaryCard>` — collapsible, shows summary + bullets + category chip.
- Skill module: `lib/ai/skills/summarize.ts`.

## 5. AI behavior

### Inputs
```ts
type SummarizeInput = {
  subject: string;
  from: string;
  date: string;          // ISO
  bodyText: string;      // post-sanitize, plain text, quoted history stripped
  attachments: { filename: string; type: string }[];
};
```

### Output (validated with zod)
```ts
type SummarizeOutput = {
  summary: string;       // ≤ 320 chars, 1–2 sentences
  bullets: string[];     // 0–5 bullets, each ≤ 100 chars
  category: "work" | "personal" | "promo" | "notification" | "newsletter" | "other";
  urgency: "high" | "medium" | "low";
  actionRequired: boolean;
};
```

### Model
Default: `gpt-4o-mini` (env `OPENAI_SUMMARY_MODEL`). Fast + cheap.

### Prompt rules
- System: defines role, output schema, constraints (JSON only, no prose).
- User turn: subject + from + date + body + attachments table.
- Truncate body to 8k chars before sending. Mark truncation in the prompt.
- `response_format: { type: "json_object" }`. Validate with zod.
- Temperature: 0.2.
- Cache key: `summarize:${PROMPT_VERSION}:${model}:${sha256(canonicalInput)}`.

### Cost guard
Refuse if estimated > 10k input tokens. With `gpt-4o-mini` a typical call is well under $0.001.

## 6. Edge cases
- Empty body → return `{ summary: subject, bullets: [], category: "other", urgency: "low", actionRequired: false }` without calling the API.
- Non-English email → still works; the model responds in the input language.
- API down or missing key → `fallback()` returns the first 140 chars of `bodyText` and `category: "other"`, with `degraded: true`.

## 7. Acceptance criteria
1. Opening an unread message triggers exactly one call to `POST /api/ai/summarize`.
2. Returning to that message hits cache (zero new API calls), verifiable by counter assertion in test.
3. `PROMPT_VERSION` change invalidates cache.
4. `SummaryCard` renders within 200 ms when cached, ≤ 2 s P95 when not.
5. With `OPENAI_API_KEY` unset, the card shows the fallback content + "AI offline" badge.

## 8. Tests
- Unit: `lib/ai/skills/summarize.test.ts` — fixture input produces a valid `SummarizeOutput` via mocked OpenAI SDK.
- Unit: prompt-snapshot test — assert the rendered system + user prompt for a fixture input.
- Unit: cache test — second call returns the cached value, no SDK call.

## 9. Open questions
- Show category color or icon? **Decision:** color dot per category (see `<PriorityBadge>`).

## 10. Status
`approved`
