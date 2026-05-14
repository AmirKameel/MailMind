# Spec 008 — AI Prioritization

## 1. Goal
Assign a priority chip (`urgent | important | normal | low`) to each message in the inbox so the user can triage faster.

## 2. Non-goals
- Auto-actions (auto-archive, auto-snooze) based on priority — v2.
- Custom priority rules per user — v2.

## 3. User stories
- As a user opening my inbox, I see colored chips on rows that indicate priority.
- As a user, I trust the chips because the model's reasoning is one tap away (hover/tap on a chip shows the one-sentence rationale).

## 4. Surface
- API: `POST /api/ai/prioritize` — `{ accountId, messageIds: string[] }` → batch return.
- Component: `<PriorityBadge>` in `<MessageRow>`.
- Skill: `lib/ai/skills/prioritize.ts`.

## 5. AI behavior

### Inputs
```ts
type PrioritizeInput = {
  user: { email: string; name?: string };
  items: Array<{
    id: string;
    subject: string;
    from: string;
    snippet: string;
    date: string;
  }>; // batch up to 20 per call
};
```

### Output
```ts
type PrioritizeOutput = {
  results: Array<{
    id: string;
    priority: "urgent" | "important" | "normal" | "low";
    reason: string; // ≤ 100 chars
  }>;
};
```

### Model
Default: `gpt-4o-mini` (env `OPENAI_PRIORITY_MODEL`). Cheap + batched.

### Prompt rules
- System: defines the four priority classes with explicit, short criteria. Forbids over-classification ("default to `normal` if unsure").
- `response_format: { type: "json_object" }`. Validate with zod.
- Temperature: 0.2.
- Batched: up to 20 items per call.
- Cost guard: refuse if estimated > 16k input tokens (chunk further).
- Cache per `(messageId, PROMPT_VERSION, model)`.

## 6. Edge cases
- Promotional / newsletter snippets → almost always `low`. Bake a heuristic into the system prompt.
- Calendar invitations → `important` by default.
- Empty batch → return `{ results: [] }` without API call.

## 7. Acceptance criteria
1. Inbox load triggers at most ⌈N/20⌉ API calls for N uncached messages.
2. Each row eventually shows a badge (or a neutral chip while pending).
3. Tap/hover shows the rationale.
4. Cached priorities load instantly on repeat visits.
5. With `OPENAI_API_KEY` unset, every chip shows `normal` and no API call is made.

## 8. Tests
- Unit: snapshot of system prompt.
- Unit: zod schema rejects malformed model outputs.
- Unit: fan-out batching — 47 items → 3 calls (20+20+7).
- E2E: render inbox with mocked AI returning priorities; verify chip colors.

## 9. Open questions
- Surface a "Why?" expandable panel or stay with tooltip? **Decision:** tooltip on desktop, long-press sheet on mobile.

## 10. Status
`approved`
