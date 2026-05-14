# MailMind

> AI-first email client — Gmail today, Microsoft 365 + IMAP tomorrow.
> Built with **Claude Code CLI** + Agent OS methodology. Runtime AI: **OpenAI**.
---

## What is this?

MailMind is the MVP slice of a multi-provider AI email client:

- **Gmail** is fully shipped (sign in with Google, read, send, reply, forward, archive, trash, label, search).
- **Microsoft 365** and **IMAP** (Yahoo, AOL, iCloud, custom) are **extension-ready** — `MailProvider` interface, provider classes, OAuth skill, IMAP skill, presets, and encryption are all in the repo. One-line enable.
- AI features on every message: **summary card**, **streamed reply drafts**, **priority chips**. Powered by OpenAI (`gpt-4o` / `gpt-4o-mini`).
- Mobile-first **PWA**. Installable. Offline shell.

This codebase is also a working demonstration of **specs-driven, agent-orchestrated development** using Claude Code CLI. See [`CLAUDE.md`](./CLAUDE.md) and [`docs/WORKFLOW.md`](./docs/WORKFLOW.md).

### Claude Code: agents, skills, hooks

Slash commands **`/spec`**, **`/implement`**, **`/review`**, **`/ship`** and the **`.claude/`** agents/skills/hooks are documented in **[`docs/AGENTS_SKILLS_HOOKS.md`](./docs/AGENTS_SKILLS_HOOKS.md)**. UI work is expected to follow **[`MailMind-Brand-Guidelines.md`](./MailMind-Brand-Guidelines.md)** (see **`.claude/skills/brand-guidelines/`** — no need to repeat “use the brand” in every prompt).

## Deliverables (interview assignment)

| Deliverable | Where |
|---|---|
| Working app | `npm run dev` — see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| `CLAUDE.md` | [`./CLAUDE.md`](./CLAUDE.md) |
| One-page architecture | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Agents / skills / hooks / commands | [`docs/AGENTS_SKILLS_HOOKS.md`](./docs/AGENTS_SKILLS_HOOKS.md) |
| **Stakeholder / interview handoff checklist** | [`docs/DELIVERABLES.md`](./docs/DELIVERABLES.md) |
| Brand guidelines (MD + HTML) | [`MailMind-Brand-Guidelines.md`](./MailMind-Brand-Guidelines.md), [`MailMind-Brand-Guidelines.html`](./MailMind-Brand-Guidelines.html) |
| Workflow writeup | [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) |
| Specs (specs-driven dev) | [`specs/`](./specs) |
| Tests | `tests/unit/` (Vitest), `tests/e2e/` (Playwright) |

## Quick start (5 minutes)

```bash
git clone <repo>
cd email2
npm install
cp .env.example .env.local
# Fill in GOOGLE_*, DATABASE_URL, AUTH_SECRET (+ OPENAI_API_KEY optional; CREDENTIAL_ENCRYPTION_KEY when IMAP)
npx prisma db push
npm run dev
```

Open http://localhost:3000 and sign in with Google. Full setup walkthrough: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router + TypeScript strict |
| UI | Tailwind + shadcn/ui-style primitives + Radix |
| Auth | Auth.js (NextAuth v5) — Google for MVP |
| DB | Postgres via Prisma (Neon / Vercel Postgres) |
| Gmail | `googleapis` |
| Microsoft (extension) | direct fetch to Microsoft Graph |
| IMAP (extension) | `imapflow` + `mailparser` + `nodemailer` |
| AI | `openai` v4 (JSON mode + streaming) |
| PWA | `@ducanh2912/next-pwa` |
| Tests | Vitest (unit) + Playwright (E2E) |
| Deploy | Vercel (optional) |

## Repo layout

```
.
├── CLAUDE.md                  ← agentic operating manual (read first)
├── README.md
├── .claude/                   ← Claude Code: agents, skills, slash commands, hooks
│   ├── settings.json          ← permissions + hook matchers
│   ├── agents/                ← spec-writer, provider-integrator, ui-builder, ai-engineer, test-runner, reviewer, pr-bot
│   ├── skills/                ← brand-guideline-generation, brand-guidelines, email-parsing, imap-connection, oauth-flow, openai-prompt-design
│   ├── commands/              ← /spec, /implement, /review, /ship
│   └── hooks/                 ← session-start, post-edit, pre-bash, stop
├── MailMind-Brand-Guidelines.md   ← brand system (narrative + tokens)
├── MailMind-Brand-Guidelines.html ← brand specimen page (open in browser)
├── specs/                     ← 000-overview → … (spec-driven features)
├── docs/                      ← ARCHITECTURE, AGENTS_SKILLS_HOOKS, DELIVERABLES, WORKFLOW, DEPLOYMENT, …
├── app/                       ← Next.js routes + API
├── components/                ← React UI (presentation only)
├── lib/                       ← providers, ai, auth, db, crypto, sanitize, log
├── prisma/                    ← schema
└── tests/                     ← unit + e2e
```

## Scripts

```bash
npm run dev            # local dev server
npm run verify         # typecheck + lint + unit tests (gate before every commit)
npm run test           # vitest
npm run test:e2e       # playwright
npm run db:push        # apply prisma schema
npm run format         # prettier
```

## Environment

See [`.env.example`](./.env.example). **Required for MVP:**

- `AUTH_SECRET`, `NEXTAUTH_URL`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Optional:**

- `OPENAI_API_KEY` — without it, AI features degrade gracefully (“AI offline” / fallbacks); the rest of the app works.
- `CREDENTIAL_ENCRYPTION_KEY` — required when you wire **IMAP** account passwords at rest (extension path); see `CLAUDE.md` §5.

## Status

- [x] Gmail provider (list, read, send, reply, forward, archive, trash, label, search)
- [x] AI summaries (`gpt-4o-mini`, JSON mode, cached, fallback)
- [x] AI reply drafts (`gpt-4o`, streaming, 3 tones)
- [x] AI inbox prioritization (`gpt-4o-mini`, batched, cached, fallback)
- [x] PWA manifest + service worker
- [x] Unit tests (crypto, sanitize, presets, AI cache, RFC822, AI fallbacks)
- [x] E2E test (landing + login)
- [x] GitHub Actions CI
- [ ] Microsoft 365 provider — implemented, awaiting one-line enable in `lib/auth.ts`
- [ ] IMAP provider — implemented, awaiting render of `AddImapForm` in Settings
- [ ] Push notifications (v2)

## Troubleshooting

### `'next' is not recognized` (Windows / PowerShell)

That means the Next.js CLI is not on your PATH — almost always because **`node_modules` was never installed** or **`npm install` failed partway** (for example `spawn EPERM` during lifecycle scripts).

1. From the project root, run:

   ```powershell
   npm install
   ```

2. If install fails with **`Error: spawn EPERM`** during `rebuild` / postinstall, install without scripts, then generate Prisma yourself:

   ```powershell
   npm install --ignore-scripts
   npx prisma generate
   ```

3. Confirm `node_modules\.bin\next.cmd` exists, then:

   ```powershell
   npm run dev
   ```

## License

MIT
