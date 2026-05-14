# Spec 007 — AI Reply Drafts

## 1. Goal
When the user clicks Reply on a message, stream a context-aware draft into the compose modal. The user can edit before sending.

## 2. Non-goals
- Learning the user's writing tone from their sent items (v2).
- Auto-send. Always require explicit user confirmation.

## 3. User stories
- As a user clicking Reply, a draft starts streaming within 1 s.
- As a user, I can interrupt the stream and start typing manually at any time.
- As a user, I can pick a tone: `concise`, `friendly`, `formal` (chip at the top of the compose modal).

## 4. Surface
- API: `POST /api/ai/draft` — Server-Sent Events stream.
- Component: `<DraftSuggestion>` inside `<ComposeModal>`.
- Skill: `lib/ai/skills/draft.ts` with `runStream(input)`.

## 5. AI behavior

### Inputs
```ts
type DraftInput = {
  intent?: string;        // optional user hint, e.g. "decline politely"
  tone: "concise" | "friendly" | "formal";
  message: MessageDetail; // the message being replied to (most recent only)
  user: { name?: string; email: string };
};
```

### Output
Streamed plain text (markdown allowed). The compose modal renders it line by line.

### Model
Default: `gpt-4o` (env `OPENAI_DRAFT_MODEL`). Premium tier — drafts are the highest-value AI surface.

### Prompt rules
- System: persona = "You are MailMind's reply assistant…", strict instruction to produce only the body of the reply (no signature, no greeting unless intent says so).
- Tone instruction injected (concise / friendly / formal).
- Body of incoming message truncated to 6k chars; quoted history stripped (`email-parsing` skill).
- Temperature: 0.6.
- Streaming: OpenAI streaming → SSE events of `{ type: "delta", text }` and a final `{ type: "done" }`.

### Cost guard
Refuse if estimated > 12k input tokens.

## 6. Edge cases
- User clicks Reply but the message has no readable body → produce a neutral "I'd like to follow up on this" placeholder.
- Network drop mid-stream → keep whatever was streamed; show "stream ended early — generate again" option.
- API key missing → no draft, compose modal opens empty, "AI offline" badge shown.

## 7. Acceptance criteria
1. Click Reply → SSE stream begins within 1 s P95.
2. Tokens render incrementally; user can type while streaming.
3. Pressing Esc cancels the stream and aborts the server request (abort signal honored).
4. Tone chip changes regenerate the draft (new stream).
5. With `OPENAI_API_KEY` unset, no API call is made and the modal shows the fallback notice.

## 8. Tests
- Unit: mocked stream — server route emits the expected SSE events for a fixture input.
- Unit: tone variation — three different tones produce three different prompts (snapshot).
- E2E: open a message, click Reply, see streamed content appear, send (mocked transport).

## 9. Open questions
- Should "Reply" always invoke AI, or be a separate "Suggest reply" button? **Decision:** auto-stream on Reply, but allow user to disable in settings (v2).

## 10. Status
`approved`
