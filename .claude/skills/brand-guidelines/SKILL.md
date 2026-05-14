# Skill: MailMind brand guidelines (**apply** / consume)

**Mandatory for every UI change** under `app/` and `components/` that affects layout, color, typography, spacing, shadows, motion, or user-facing **tone** (labels, empty states, errors). Read this skill **without being asked** — `CLAUDE.md` §4 and the `ui-builder` agent require it.

> **Creating or overhauling** the guideline **documents** themselves (`MailMind-Brand-Guidelines.md` / `.html`)? Use **`brand-guideline-generation`** first, then return here to sync tokens into code.

## Source of truth (read in this order)

1. **`MailMind-Brand-Guidelines.md`** — full system: essence, logo, color tokens (oklch), typography (Instrument Serif + Inter + JetBrains Mono), radius, shadows, motion, component patterns, accessibility, do/don’t.
2. **`MailMind-Brand-Guidelines.html`** — living reference: hero, swatches, type specimens, inbox row + AI summary + tab bar. Open in a browser when you need pixel-level cues.
3. **Implemented tokens** — `app/globals.css` (`:root` / `.dark` CSS variables) and `tailwind.config.ts` (semantic colors, fonts, radii, shadows, gradients).

## Hard rules

- **No hardcoded hex** in components unless documenting a one-off; use Tailwind semantic tokens (`bg-background`, `text-primary`, `text-ai`, `border-border`, etc.) or CSS variables from `globals.css`.
- **Primary = lavender** (`--primary`), not generic blue. **AI-only accent** = `--ai` (pink/lavender) for summaries, drafts, and AI priority — never use `--ai` for plain chrome or default CTAs.
- **Typography:** one **Instrument Serif** moment per screen (page title, hero line, or empty state). Body stays **Inter** (`font-sans`). Code / metadata: **JetBrains Mono** (`font-mono`).
- **Voice:** friendly, lowercase-leaning, short (see guidelines §1 for microcopy examples).
- **Motion:** short hovers (`duration-hover`); respect `prefers-reduced-motion` (already in `globals.css`).
- **Icons:** Lucide only; **Sparkles** for AI — no robot/brain/wand metaphors (guidelines §6 / §11).
- **Don’t** add calendar/tasks/contacts UI — product scope is email only.

## Implementation checklist (UI change)

- [ ] Colors/radius/shadows map to existing tokens; if a new token is truly needed, add it to `globals.css` **and** `tailwind.config.ts`, then document in `MailMind-Brand-Guidelines.md` in the same change.
- [ ] Touch targets ≥ **44px** height on mobile (`min-h-11` pattern).
- [ ] Focus visible: `focus-visible:ring-2 focus-visible:ring-ring/35` (or Button defaults).
- [ ] AI surfaces: optional `bg-gradient-ai-glow` overlay + sparkle + `text-ai` / `text-ai-foreground` for labels.
- [ ] Run **`npm run verify`** after UI edits.

## When this skill applies

- New route or shell layout, inbox rows, compose sheet, settings, marketing landing, login.
- Tweaking `SummaryCard`, `ReplyDrafter`, `PriorityBadge`, `AppShell`, `MailMindLogo`, or shared `components/ui/*`.

## Output expectation

Ship UI that feels **calm, soft, and on-brand** — generous whitespace, rounded containers (`rounded-lg`+), warm neutrals, lavender used sparingly (~10–15% of the screen per guidelines).
