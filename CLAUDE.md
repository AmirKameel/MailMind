# CLAUDE.md — MailMind Agentic Operating Manual

> Master rules file for Claude Code (and any agent) operating in this repo.
> Read this **first, every session**. Everything below is binding.

## 0. Project at a glance

**Product:** MailMind — an AI-first universal email client (PWA).

**MVP scope (agreed with stakeholder):**
- **Gmail** is the one fully-implemented provider for v1.
- **Microsoft 365 / Outlook** and **IMAP** (Yahoo, AOL, iCloud, custom) are **extension targets** — the `MailProvider` interface, stubs, OAuth skill, and IMAP skill are all in place to prove the architecture extends to them, but they are not wired into the active UI for the MVP.

**Surface:** mobile-first PWA, optionally deployable to Vercel, single Next.js codebase.
**Differentiator:** AI summaries, AI reply drafts, AI prioritization — all running on **OpenAI** (gpt-4o / gpt-4o-mini).

**About the tooling vs. the AI features (important distinction):**
- We **build** this codebase using **Claude Code CLI** + the agentic workflow in `.claude/`. That's the development tool.
- The **app's runtime AI features** call **OpenAI**. That's the product. These are two different things; don't confuse them.

**This codebase is also a deliverable for an interview assignment.** Discipline matters as much as features. The repo must demonstrate **specs-driven, agent-orchestrated development**.

---

## 1. North-star principles

1. **Spec before code.** No feature is implemented without a markdown spec in `specs/` describing intent, scope, acceptance, and edge cases.
2. **Provider-agnostic core.** The `MailProvider` interface (`lib/providers/MailProvider.ts`) is the only contract the UI knows about. Adding a new provider must never require UI changes. **For MVP only Gmail is wired; Microsoft and IMAP stubs exist to prove this contract.**
3. **Server-only secrets.** OAuth tokens, IMAP passwords, and `OPENAI_API_KEY` never reach the browser. Encrypt IMAP credentials at rest using `CREDENTIAL_ENCRYPTION_KEY`.
4. **AI is a feature, not a crutch.** AI calls are async, cached, and degrade gracefully. The email client must be fully functional with `OPENAI_API_KEY` unset.
5. **Mobile-first.** Every screen designed at 360 px first, then scaled up. Touch targets ≥ 44 px.
6. **Definition of done** (see §8) is non-negotiable.
7. **Speed beats perfection** for this assignment. Prefer shipping a smaller, working surface over a larger, broken one. Use feature flags and clear `// TODO(provider:o365):` markers where appropriate.

---

## 2. Tech stack (locked — do not bikeshed)

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript strict** | One codebase, edge-friendly, Vercel-native |
| UI | **Tailwind + shadcn/ui primitives + Radix** | Speed, accessibility, mobile-first |
| Auth | **Auth.js (NextAuth v5)** + Prisma adapter | Google + Microsoft OAuth out of the box |
| DB | **Postgres via Prisma** (Neon / Vercel Postgres) | Stores accounts, encrypted creds, AI cache |
| IMAP (extension) | `imapflow` + `mailparser` + `nodemailer` (SMTP) | Maintained, modern, supports IDLE |
| Gmail (**MVP**) | `googleapis` | Official |
| Microsoft (extension) | direct `fetch` to Microsoft Graph | No bloated SDK |
| AI | `openai` SDK (v4) | Streaming, JSON mode, function calling, official |
| State | **React Query** for server state, **Zustand** for client UI state | Small, sharp, no Redux |
| PWA | `@ducanh2912/next-pwa` | Maintained fork of next-pwa |
| Tests | **Vitest** (unit) + **Playwright** (E2E) | Standard |
| Deploy | **Vercel** | Required by assignment |

> If a future need genuinely requires a different choice, document it in a spec and update this table in the same commit.

---

## 3. Repository layout

```
.
├── CLAUDE.md                  ← you are here
├── README.md                  ← human onboarding
├── .claude/
│   ├── settings.json          ← hooks, permissions
│   ├── agents/                ← subagent definitions
│   ├── skills/                ← reusable capabilities (incl. brand-guideline-generation + brand-guidelines)
│   └── commands/              ← slash commands (/spec, /implement, /review, /ship)
├── specs/                     ← markdown specs, numbered 000-…, 001-…, etc.
├── docs/                      ← deliverable docs (architecture, workflow, agents list)
├── app/                       ← Next.js App Router (routes + API)
├── components/                ← React components
│   └── ui/                    ← primitive shadcn-style components
├── lib/
│   ├── providers/             ← MailProvider interface + Gmail/Microsoft/IMAP
│   ├── ai/                    ← OpenAI client + skills (summarize/draft/prioritize)
│   ├── auth.ts                ← NextAuth config
│   ├── db.ts                  ← Prisma client
│   ├── crypto.ts              ← AES-GCM encryption for IMAP creds
│   └── types.ts               ← shared types
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/                  ← Vitest
│   └── e2e/                   ← Playwright
└── public/                    ← static + PWA assets
```

---

## 4. Coding standards

- **TypeScript strict.** No `any` without a `// reason:` comment.
- **No default exports** except React pages/layouts and Next.js conventions.
- **Imports** ordered: stdlib → third-party → `@/lib` → `@/components` → relative.
- **Errors** never silently swallowed. Use `Result<T, E>` shape (`{ ok: true, data } | { ok: false, error }`) for fallible operations crossing module boundaries.
- **Server actions / route handlers** validate inputs with `zod`. Always.
- **Logs** go through `lib/log.ts` (to be created), not raw `console.*`, except in scripts.
- **Comments** explain *why*, not *what*. Don't narrate the code.
- **File length** target < 250 lines; split when it grows beyond.
- **Tests** colocated when small (`foo.test.ts` next to `foo.ts`), or in `tests/unit/` when broader.

### Brand & UI (mandatory)

- Any change under `app/` or `components/` that affects **layout, color, typography, spacing, shadows, motion**, or user-facing **copy tone**: read and follow **`.claude/skills/brand-guidelines/SKILL.md`**. Do **not** wait for the human to say “use the brand guidelines.”
- **Creating or overhauling** brand deliverables (`MailMind-Brand-Guidelines.md`, `MailMind-Brand-Guidelines.html`, or successors): follow **`.claude/skills/brand-guideline-generation/SKILL.md`**, then sync **`app/globals.css`** and **`tailwind.config.ts`** so the app matches the doc.

---

## 5. Security rules (hard)

1. **Never** log access tokens, refresh tokens, or IMAP passwords. Redact via `lib/log.ts`.
2. **Never** return raw OAuth tokens to the browser. Tokens stay server-side; the browser uses session cookies.
3. **IMAP passwords** are AES-256-GCM encrypted with `CREDENTIAL_ENCRYPTION_KEY` before write to DB. Decryption only inside server actions.
4. **HTML email bodies** are sanitized through `dompurify` (with a `happy-dom` `Window` on the server — avoids jsdom ESM issues in Next RSC) before rendering. Configure strict allowlist; no scripts, no inline event handlers, no remote images by default (lazy-load on user click).
5. **CSRF**: rely on Auth.js CSRF + same-site cookies. Never use POST forms without it.
6. **Rate limit** AI endpoints per session (in-memory token bucket is fine for MVP, Upstash later).
7. **CSP**: defined in `next.config.mjs` headers — `default-src 'self'`, plus explicit allowlists for Google avatars and Microsoft Graph.

---

## 6. The MailProvider contract

All providers implement `lib/providers/MailProvider.ts`:

```ts
export interface MailProvider {
  readonly id: "gmail" | "microsoft" | "imap";
  listMessages(opts: ListOptions): Promise<Page<MessageSummary>>;
  getMessage(id: string): Promise<MessageDetail>;
  sendMessage(input: ComposeInput): Promise<{ id: string }>;
  markRead(id: string, read: boolean): Promise<void>;
  archive(id: string): Promise<void>;
  trash(id: string): Promise<void>;
  addLabel(id: string, label: string): Promise<void>;
  removeLabel(id: string, label: string): Promise<void>;
  search(query: string, opts?: SearchOptions): Promise<Page<MessageSummary>>;
  listLabels(): Promise<Label[]>;
}
```

**Rule:** UI imports only `MessageSummary`, `MessageDetail`, `Label` — never provider-specific types. Mapping happens inside each provider.

---

## 7. AI rules

- All OpenAI calls go through `lib/ai/openai.ts`. No direct SDK use elsewhere.
- Models are configured via env: `OPENAI_SUMMARY_MODEL`, `OPENAI_DRAFT_MODEL`, `OPENAI_PRIORITY_MODEL`. Defaults set in `.env.example`.
- **JSON mode** (`response_format: { type: "json_object" }`) is mandatory for skills with structured output (summarize, prioritize). Validate every response with `zod`.
- **Caching is mandatory.** Cache by `(messageId, model, promptVersion)` in DB. Never re-summarize the same message.
- **Prompt versioning.** Every skill has a `PROMPT_VERSION` constant. Bumping it invalidates cache automatically.
- **Streaming** for draft generation (user is watching). Non-streaming for summaries and prioritization (background batch).
- **Tool / function calling** is allowed only for skills that need it. Keep tools minimal and typed (declare with `zod` and convert via `zodToJsonSchema` if used).
- **Cost guard:** before any non-cached call, estimate input tokens. If estimate > the per-skill budget (specs/006-008), refuse and request truncation.
- **Temperature**: 0.2 for structured tasks (summarize, prioritize); 0.6 for drafts.

---

## 8. Definition of Done

A change is **DONE** only when:

1. The relevant spec in `specs/` is updated to reflect reality.
2. `npm run verify` passes (typecheck + lint + unit tests).
3. New behavior has at least one unit test or one E2E test.
4. Mobile (360 px) and desktop (1280 px) render without overflow.
5. No new ESLint errors. Warnings explained inline.
6. Commit message follows §10. PR (if any) follows §11.
7. `docs/AGENTS_SKILLS_HOOKS.md` is updated if you added/changed an agent, skill, hook, or command.

---

## 9. Workflow — how agents collaborate

The canonical loop for any feature:

```
/spec <feature>          → spec-writer drafts specs/NNN-feature.md
   ↓ human review (or self-review against checklist)
/implement specs/NNN-…   → router agent picks the right specialist:
                              • provider-integrator   (anything in lib/providers/)
                              • ui-builder            (anything in components/ or app/)
                              • ai-engineer           (anything in lib/ai/)
   ↓
/review                  → reviewer agent reads diff against the spec + this file
   ↓
test-runner agent runs   → npm run verify + relevant e2e
   ↓
/ship                    → pr-bot creates commit + (if remote) PR
```

Hooks (configured in `.claude/settings.json`) enforce parts of this automatically:
- `PostToolUse(Edit|Write)` → prettier + targeted `tsc --noEmit`.
- `PreToolUse(Bash:git commit)` → run `npm run verify` and refuse on failure.
- `SessionStart` → echo "Read CLAUDE.md, specs/, and recent commits before acting."

---

## 10. Git / commit conventions

Conventional Commits:

```
feat(provider/gmail): list messages with pagination cursor
fix(ui/inbox): prevent overflow on narrow viewports
docs(specs/006): clarify summary cache invalidation
chore(ci): add playwright to actions matrix
```

Scopes: `provider/{gmail,microsoft,imap}` (microsoft/imap are extension targets), `ai/{summary,draft,priority}`, `ui/{inbox,compose,settings,...}`, `auth`, `db`, `specs/NNN`, `ci`, `chore`.

One logical change per commit. No "wip" commits on `main`.

---

## 11. PR conventions

PR title = top commit message. PR body template (auto-filled by `/ship` if PR creation is requested):

```md
## Summary
<2–5 bullets>

## Related spec(s)
- specs/NNN-feature.md

## Test plan
- [ ] npm run verify
- [ ] manual: <steps>
- [ ] mobile @ 360px
```

---

## 12. Things you must NOT do

- ❌ Add a new dependency without justifying it in the commit message.
- ❌ Edit `.env*` files (only `.env.example` is committed).
- ❌ Push directly to `main` if a PR can be opened.
- ❌ Skip tests with `.skip` / `.only` left in committed code.
- ❌ Disable TypeScript strict, ESLint rules, or hooks without writing a follow-up spec.
- ❌ Inline secrets, even temporarily.
- ❌ Use `dangerouslySetInnerHTML` with anything that hasn't been through `lib/sanitize.ts`.

---

## 13. Quick reference — common commands

```bash
npm run dev            # local dev server
npm run verify         # typecheck + lint + tests (RUN BEFORE EVERY COMMIT)
npm run test           # unit tests only
npm run test:e2e       # playwright e2e
npm run db:push        # apply prisma schema
npm run format         # prettier on everything
```

---

## 14. When you are blocked

If a spec is ambiguous, **do not guess silently**. Open the spec, add an `## Open questions` section with your concrete options and a recommendation, then proceed with the recommendation. The human can override on review.

---

## 15. Self-improvement hook

End every non-trivial session by appending one line to `docs/WORKFLOW.md` under "Lessons" — what worked, what was friction, what you'd automate next. This file is itself a deliverable.
