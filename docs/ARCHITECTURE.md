# MailMind — One-Page Architecture

> **MVP scope (agreed with stakeholder):** Gmail provider fully implemented; Microsoft 365 and IMAP are extension-ready (interface + stubs + skills shipped).
> **Built with:** Claude Code CLI (agentic development tool). **Runtime AI:** OpenAI (`gpt-4o` / `gpt-4o-mini`).

## Topology

```
┌─────────────────────── Vercel (Node runtime) ──────────────────────┐
│                                                                      │
│  Next.js 15 App Router (TypeScript strict)                           │
│  ┌───────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │ React UI          │──▶│ Server actions / │──▶│ lib/providers  │  │
│  │ (RSC + islands)   │   │ route handlers   │   │ Gmail (MVP)    │  │
│  │ Tailwind +        │   │ + zod validation │   │ Microsoft (ext)│  │
│  │ shadcn primitives │   │ + Auth.js auth() │   │ IMAP (ext)     │  │
│  └─────────┬─────────┘   └────────┬─────────┘   └────────┬───────┘  │
│            ▲                      │                       │          │
│            │                      ▼                       ▼          │
│            │              ┌──────────────┐         ┌─────────────┐   │
│            │              │ lib/ai       │         │ Gmail API   │   │
│            │              │ (OpenAI SDK +│         │ MS Graph    │   │
│            │              │  skills +    │         │ IMAP/SMTP   │   │
│            │              │  cache)      │         └─────────────┘   │
│            │              └──────┬───────┘                            │
│            │                     ▼                                    │
│            │              ┌──────────────┐                            │
│            │              │  Postgres    │                            │
│            │              │  via Prisma  │ (Neon / Vercel)            │
│            │              └──────────────┘                            │
│            │                                                          │
│            └─ Service worker (next-pwa) → offline shell + cache       │
└──────────────────────────────────────────────────────────────────────┘
```

## Three boundaries you must know

1. **`MailProvider` interface** (`lib/providers/MailProvider.ts`) — the only contract the UI knows. Adding a new provider is a new file, never a UI change.
2. **`lib/ai/openai.ts`** — the single OpenAI entry point. All skills route through it. UI never imports the OpenAI SDK.
3. **`lib/auth.ts`** — the single Auth.js config. Tokens never cross to the browser; the browser carries only session cookies.

## Module map

| Path | Responsibility |
|---|---|
| `app/` | Routes, layouts, server actions, API handlers |
| `components/` | Presentation; never imports providers or AI SDK |
| `components/ai/*` | UI clients of `/api/ai/*` (SummaryCard, ReplyDrafter) |
| `lib/providers/` | Gmail (MVP), Microsoft (ext), IMAP (ext) + registry |
| `lib/ai/` | OpenAI client + skills (summarize / draft / prioritize) + cache |
| `lib/auth.ts` | NextAuth + Gmail scopes |
| `lib/db.ts` | Prisma singleton |
| `lib/crypto.ts` | AES-256-GCM (for IMAP creds, post-MVP) |
| `prisma/` | Schema + migrations |
| `specs/` | Spec-driven dev source of truth |
| `.claude/` | Agents, skills, slash commands, hooks |

## Data model (Postgres + Prisma)

- `User` — identity (Google email).
- `Account` (Auth.js managed) — OAuth tokens. **Never** rendered.
- `Session` — DB-strategy sessions; cookies carry only opaque session tokens.
- `EmailAccount` — user's mailboxes (Gmail today; Microsoft/IMAP extension-ready).
- `AISummary` — cache for all AI skills, keyed by `(emailAccountId, messageId, skill, promptVersion, model)`. Bumping `PROMPT_VERSION` invalidates by design.

## Request paths

| User action | Where the work happens |
|---|---|
| Open `/inbox` | `app/inbox/page.tsx` → server action `listUnifiedInbox` → fan-out across each `EmailAccount` via `getProvider(account).listMessages` |
| Open a message | `app/inbox/[id]/page.tsx` → `provider.getMessage` (full MIME walk for Gmail) → HTML through `lib/sanitize.ts` |
| AI summary | Browser POST → `/api/ai/summarize` → `lib/ai/skills/summarize.run` (zod-validated, JSON-mode OpenAI call) → DB cache |
| AI reply draft | Browser POST → `/api/ai/draft` → OpenAI streaming → SSE to `<ReplyDrafter>` |
| Prioritize | Background fetch → `/api/ai/prioritize` → batched call (20 msgs) → cached per message |
| Send | `app/compose/actions.ts` → `provider.sendMessage` → Gmail `users.messages.send` |

## Security posture

- Auth.js **database session strategy** — JWT does not carry tokens.
- OAuth tokens stored on `Account` rows; refreshed automatically (Gmail via `googleapis`, Microsoft via direct fetch refresh).
- IMAP passwords (when used) AES-256-GCM encrypted at rest with `CREDENTIAL_ENCRYPTION_KEY`.
- All HTML email rendered through `lib/sanitize.ts` (DOMPurify) with strict allowlist; remote images blocked by default (anti-tracking).
- Inputs at API & action boundaries validated with `zod`.
- `lib/log.ts` redacts tokens / passwords from structured logs.

## Performance

- **Inbox fan-out**: `Promise.allSettled` across accounts, fail one → others render with banner.
- **AI cache**: per-message, per-prompt-version. Repeat reads are zero-API.
- **PWA**: app shell stale-while-revalidate; API calls network-only.
- **Edge**: route handlers run on Node (required for `googleapis`, `imapflow`, `nodemailer`). UI is RSC for fast first paint.

## Extension path (Microsoft & IMAP)

The whole codebase is built around the assumption that Microsoft and IMAP arrive next:

1. Microsoft: uncomment `MicrosoftEntraID(...)` in `lib/auth.ts`, add env vars, ship.
2. IMAP: render `AddImapForm` in Settings (already implemented + tested with the encryption round-trip).
3. Inbox `Promise.allSettled` already iterates over every `EmailAccount` — zero changes there.

The cost of v1.1 is hours, not days, because the abstraction was built in v1.
