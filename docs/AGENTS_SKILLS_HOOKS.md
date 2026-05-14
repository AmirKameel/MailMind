# Agents, skills, hooks, and slash commands

Canonical inventory for **Claude Code** (and any agent) in this repo. Source files live under **`.claude/`**. Human-readable rules live in **[`CLAUDE.md`](../CLAUDE.md)**.

---

## Subagents (`.claude/agents/`)

Each agent is a markdown file (`*.md`) with YAML frontmatter (`name`, `description`, `tools`, `model`).

| Agent | Model | Owns | Invoke when |
| --- | --- | --- | --- |
| `spec-writer` | sonnet | `specs/` | New feature or non-trivial change — **before** code |
| `provider-integrator` | sonnet | `lib/providers/`, OAuth, IMAP lifecycle | Gmail / Microsoft / IMAP: list, read, send, labels, errors |
| `ui-builder` | sonnet | `app/`, `components/` | Routes, layouts, screens, PWA shell, a11y, Tailwind UI |
| `ai-engineer` | sonnet | `lib/ai/` | OpenAI client, prompts, skills, cache, prompt versions |
| `test-runner` | haiku | CI-style verification | After implementation: `npm run verify`, Playwright as needed |
| `reviewer` | sonnet | Quality gate | Before commit / `/ship` — diff vs spec + `CLAUDE.md` |
| `pr-bot` | haiku | Git + PR hygiene | After approval: stage, Conventional Commit, optional PR |

**Shared contract:** read **`CLAUDE.md`** first, work from the cited **`specs/NNN-*.md`**, run **`npm run verify`** before merge, report in a structured handoff.

### Which skills each specialist should read

| Agent | Skills (read `SKILL.md` in each folder) |
| --- | --- |
| `spec-writer` | N/A by default; if the spec has UI acceptance criteria, skim **`brand-guidelines`** |
| `provider-integrator` | **`oauth-flow`**, **`imap-connection`**, **`email-parsing`** |
| `ui-builder` | **`brand-guidelines`** (mandatory for every UI change); **`brand-guideline-generation`** only when authoring/overhauling `MailMind-Brand-Guidelines.*` |
| `ai-engineer` | **`openai-prompt-design`**; **`email-parsing`** when MIME/threading touches a skill |
| `test-runner` | None required |
| `reviewer` | **`brand-guidelines`** when the diff touches `app/` or `components/` |
| `pr-bot` | None required |

---

## Skills (`.claude/skills/`)

Each skill is a directory with **`SKILL.md`**.

| Skill | Path | Purpose |
| --- | --- | --- |
| `brand-guideline-generation` | `.claude/skills/brand-guideline-generation/SKILL.md` | **Author** brand docs: `MailMind-Brand-Guidelines.md` + `.html`, then sync tokens into `app/globals.css` / `tailwind.config.ts` |
| `brand-guidelines` | `.claude/skills/brand-guidelines/SKILL.md` | **Apply** brand in code — mandatory for all UI under `app/` + `components/` (tokens, type, AI accent, voice); read **without** the human repeating it |
| `email-parsing` | `.claude/skills/email-parsing/SKILL.md` | MIME, HTML sanitize, threading, reply/forward, quoted history |
| `imap-connection` | `.claude/skills/imap-connection/SKILL.md` | IMAP/SMTP, presets, IDLE, errors |
| `oauth-flow` | `.claude/skills/oauth-flow/SKILL.md` | Auth.js providers, scopes, refresh tokens |
| `openai-prompt-design` | `.claude/skills/openai-prompt-design/SKILL.md` | OpenAI: JSON mode, streaming, cost guards, `PROMPT_VERSION` |

**Brand pipeline:** **`brand-guideline-generation`** (docs + tokens) → every UI change follows **`brand-guidelines`** → **`reviewer`** checks UX against the same rules.

Bindings: **`CLAUDE.md` §4** (Brand & UI) and **`ui-builder`** required reading.

---

## Slash commands (`.claude/commands/`)

| Command | File | Action |
| --- | --- | --- |
| `/spec <feature>` | `.claude/commands/spec.md` | Route to **spec-writer** → new `specs/NNN-<feature>.md` |
| `/implement specs/NNN-…` | `.claude/commands/implement.md` | Read spec → **provider-integrator** / **ui-builder** / **ai-engineer** → **test-runner** |
| `/review [spec]` | `.claude/commands/review.md` | **Reviewer** vs diff + spec + `CLAUDE.md` |
| `/ship [type/scope]` | `.claude/commands/ship.md` | Verify → review → **pr-bot** (commit, push, optional PR; no direct force-push to `main`) |

---

## Hooks (`.claude/settings.json` + `.claude/hooks/`)

Configured under **`hooks`** in **`.claude/settings.json`**.

| Hook event | Matcher | Script | Purpose |
| --- | --- | --- | --- |
| `SessionStart` | `*` | `node .claude/hooks/session-start.mjs` | Prime session: `CLAUDE.md`, specs, git, brand skills |
| `PostToolUse` | `Edit`, `Write`, `MultiEdit` | `node .claude/hooks/post-edit.mjs` | Prettier + targeted `tsc --noEmit` after edits |
| `PreToolUse` | `Bash` | `node .claude/hooks/pre-bash.mjs` | Block dangerous shell; gate **`git commit`** on `npm run verify` |
| `Stop` | `*` | `node .claude/hooks/stop.mjs` | Remind: log a line in **`docs/WORKFLOW.md`** “Lessons” (`CLAUDE.md` §15) |

---

## Permissions (`.claude/settings.json`)

**Allow (summary):** Read/Glob/Grep broadly; Edit/Write under repo; `npm`, `npx`, `node`, `pnpm`, `git`, `gh`, `prisma`, `prettier`, `tsc`, `vitest`, `playwright`, `vercel`.

**Deny:** Read/write **`.env`**, **`.env.local`**, **`.env.production`**; `rm -rf` patterns; **`curl`** / **`wget`**; **`git push --force`** / **`git push -f`**.

---

## Plugins

No custom Claude Code plugins ship in this MVP. The **agent + skill + command + hook** layout above is the supported extension surface.

---

## Example feature flow

```
idea
  →  /spec "…"          →  spec-writer  →  specs/NNN-….md
  →  /implement …      →  ai-engineer + ui-builder (ui-builder → brand-guidelines)
  →  test-runner         →  npm run verify (+ e2e if needed)
  →  /review             →  reviewer (incl. brand if UI)
  →  /ship feat/…        →  pr-bot
```

Each step stays traceable: the **spec** is the source of truth; commits reference it; **reviewer** enforces **`CLAUDE.md`** and security.

---

## See also

| Doc | Use |
| --- | --- |
| [`CLAUDE.md`](../CLAUDE.md) | Binding project rules, §4 brand/UI, §8 definition of done |
| [`docs/DELIVERABLES.md`](./DELIVERABLES.md) | What to hand reviewers / interview (demo, docs, honest gaps) |
| [`docs/WORKFLOW.md`](./WORKFLOW.md) | Agent loop + lessons log |
| [`MailMind-Brand-Guidelines.md`](../MailMind-Brand-Guidelines.md) | Brand narrative + tokens (paired with `.html`) |
