# Spec 010 — Testing strategy

## 1. Goal
Define the minimum testing bar for MailMind so every PR can be evaluated mechanically.

## 2. Non-goals
- 100% coverage. (Wasteful for this scope.)
- Visual regression testing in v1.

## 3. Pyramid
```
        ┌────────────┐
        │   E2E      │   Playwright × 1 happy path per critical flow
        │  (slow)    │
        └────────────┘
   ┌──────────────────────┐
   │   Component / API    │   Vitest + happy-dom + React Testing Library
   │      (medium)        │
   └──────────────────────┘
┌────────────────────────────┐
│   Unit (pure functions)    │   Vitest, fast, lots of them
│        (fast)              │
└────────────────────────────┘
```

## 4. Required tests for v1

### Unit
- `lib/crypto.test.ts` — encrypt/decrypt round-trip.
- `lib/sanitize.test.ts` — strips scripts, blocks remote `<img>`.
- `lib/email/build-reply.test.ts` — reply/reply-all/forward correctness.
- `lib/providers/imap-presets.test.ts` — yahoo/aol/icloud/fastmail.
- `lib/ai/skills/summarize.test.ts` — mocked SDK + zod validation.
- `lib/ai/skills/draft.test.ts` — SSE stream shape.
- `lib/ai/skills/prioritize.test.ts` — batching logic.
- `lib/ai/cache.test.ts` — hit/miss + version invalidation.

### E2E (Playwright)
- `tests/e2e/login.spec.ts` — landing page → "Sign in with Google" redirects.
- `tests/e2e/inbox.spec.ts` — with a mocked session + mocked providers, the inbox renders.
- `tests/e2e/compose.spec.ts` — open Reply, see streamed draft (mocked AI).

## 5. Mocks
- OpenAI: `vi.mock("openai")` in unit tests, or set `OPENAI_API_KEY=""` to exercise the fallback path.
- Providers: `vi.mock("@/lib/providers/registry")` returning canned `Page<MessageSummary>` fixtures.
- Auth: `vi.mock("@/lib/auth")` returning a stub session.

## 6. CI
- GitHub Actions workflow `.github/workflows/ci.yml`:
  - Job `verify`: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`.
  - Job `e2e` (only on PRs touching `app/` or `components/`): boots dev server + `npm run test:e2e`.
- Required check: `verify` must pass before merge.

## 7. Acceptance
1. `npm run verify` passes on a clean clone.
2. CI green on `main`.
3. At least one E2E test runs successfully against a local server.

## 8. Status
`approved`
