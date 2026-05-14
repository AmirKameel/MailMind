# Workflow writeup — building MailMind with Claude Code

> How this repo was actually built. Process, not pixels.

## TL;DR

MailMind was built using a strict **specs-driven, agent-orchestrated** workflow inside Claude Code CLI. The repo enforces it mechanically (hooks, permissions, slash commands) so no contributor — human or agent — can ship code that bypasses the spec, the type checker, the linter, the tests, or the reviewer.

The result: a multi-provider AI email client with a fully shipped Gmail slice, an OpenAI-powered AI layer (summaries, streamed reply drafts, prioritization), and an extension path to Microsoft 365 and IMAP that is **already wired** — no UI changes needed when those land.

## The loop

```
                 ┌───────────────────────────┐
   intent ──────▶│  /spec  (spec-writer)     │  → specs/NNN-feature.md
                 └─────────────┬─────────────┘
                               ▼
                 ┌───────────────────────────┐
                 │ /implement specs/NNN-…    │
                 │   • provider-integrator   │
                 │   • ui-builder            │
                 │   • ai-engineer           │
                 └─────────────┬─────────────┘
                               ▼
                 ┌───────────────────────────┐
                 │ test-runner (npm verify)  │
                 └─────────────┬─────────────┘
                               ▼
                 ┌───────────────────────────┐
                 │ /review (reviewer)        │
                 │ APPROVE | REQUEST | BLOCK │
                 └─────────────┬─────────────┘
                               ▼
                 ┌───────────────────────────┐
                 │ /ship (pr-bot)            │
                 │ commit (Conventional)     │
                 │ push + open PR           │
                 └───────────────────────────┘
```

## Why this works

1. **`CLAUDE.md` is the constitution.** Every session starts by reading it (enforced by a SessionStart hook). Coding standards, security rules, AI rules, definition-of-done, commit conventions — all in one file. There is no "tribal knowledge."
2. **Specs precede code, always.** `spec-writer` is the only agent allowed to create files under `specs/`. Specs use a fixed template (goal, non-goals, surface, data model, edge cases, acceptance, tests, open questions). Implementation agents read the spec and must satisfy every acceptance criterion.
3. **Specialists, not generalists.** Each agent has a scoped charter (`provider-integrator`, `ui-builder`, `ai-engineer`, …). They read CLAUDE.md, then *only* the relevant skill and spec. This keeps reasoning focused and reduces context bleed.
4. **Skills are how knowledge compounds.** Recurring patterns (OAuth scopes, IMAP presets, MIME walking, OpenAI prompt design) live in `.claude/skills/`. Any future agent can apply them without re-deriving them.
5. **Hooks enforce the rules.** Edits trigger Prettier + `tsc`. Commits trigger `npm run verify`. Dangerous bash is blocked at the syscall layer. The agent can't "forget" the standards.
6. **The reviewer is real.** `reviewer` doesn't write code; it reads diffs against the spec + `CLAUDE.md` and votes APPROVE / REQUEST_CHANGES / BLOCK_FOR_SECURITY. No PR ships without it.
7. **Self-improvement is built in.** The Stop hook nudges every session to append a one-line lesson to this file. The system gets sharper every commit.

## Concrete examples

### Example 1 — "Add AI summaries"

1. Human: `/spec ai-summaries`.
2. `spec-writer` produced `specs/006-ai-summaries.md` with the JSON schema, model choice, caching strategy, fallback rules, and acceptance criteria.
3. Human: `/implement specs/006-ai-summaries.md`.
4. `ai-engineer` produced `lib/ai/skills/summarize.ts` (PROMPT_VERSION, zod schema, JSON-mode OpenAI call, cache, fallback).
5. `ui-builder` produced `components/ai/SummaryCard.tsx` and `app/api/ai/summarize/route.ts`.
6. `test-runner` ran `npm run verify`. The PostToolUse hook had already kept the working tree formatted and typed.
7. `reviewer` confirmed: cache used, fallback present, no `OPENAI_API_KEY` in logs.
8. `pr-bot` committed `feat(ai/summary): cache + JSON-mode + graceful fallback` referencing `specs/006`.

### Example 2 — "Send a reply email through Gmail"

1. Spec `specs/004-message-actions.md` defines reply/forward header building and the per-provider send mapping.
2. `provider-integrator` implemented `GmailProvider.sendMessage` (RFC822 build + base64url encode + `users.messages.send`).
3. `ui-builder` shipped `components/ai/ReplyDrafter.tsx` (SSE consumer + tone toggle + send button) and `app/compose/actions.ts` (zod-validated server action).
4. Reviewer verified the `In-Reply-To` and `References` headers were built per `email-parsing` skill.
5. Unit test `tests/unit/rfc822.test.ts` asserts the encoded payload.

## Lessons (append-only, per CLAUDE.md §15)

- Spec template enforcement was the highest-ROI early decision. Every agent now knows where to find "what's the acceptance criteria?"
- JSON mode (OpenAI's `response_format: { type: "json_object" }`) plus zod validation eliminated an entire class of "model returned prose" bugs we expected to fight.
- Caching by `(messageId, promptVersion, model)` means iterating on prompts is cheap: bump the version, see the new outputs, old ones don't go stale incorrectly.
- The Microsoft + IMAP "extension target" stubs proved valuable for the architecture story even though they're not in the MVP UI — they make the abstraction visible.
- Hooks doing `tsc --noEmit` after every edit caught ~5 type errors before they ever reached `npm run verify`, saving multi-second feedback cycles.
- Conventional Commit + Spec-reference in the commit body gives the reviewer (and future humans) a clean lineage: code → commit → spec → acceptance.
