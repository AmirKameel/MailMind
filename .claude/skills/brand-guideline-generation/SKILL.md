# Skill: MailMind brand guideline **generation**

Use this skill when you are **creating, replacing, or substantially revising** the product’s brand system as **documentation** (not when you are only implementing UI in code — for that, use **`brand-guidelines`**).

## When to use

- Stakeholder asks for a **new** brand book, visual refresh, or “design system doc” from scratch.
- You need to **reconcile** `MailMind-Brand-Guidelines.md` / `.html` with a changed product direction (e.g. new tagline, new AI positioning).
- You are **splitting** a monolithic guideline file into versioned artifacts (v1.0, v1.1).

## Outputs (always ship together)

1. **`MailMind-Brand-Guidelines.md`** (canonical text) — must include at minimum:
   - Brand essence, pillars, voice & tone (with microcopy examples)
   - Logo construction + clear space + don’ts
   - **Color:** tokens in `oklch` (light + dark), `--ai` separate from `--primary`, gradients, usage rules
   - **Typography:** Instrument Serif + Inter + JetBrains Mono, roles and sizes
   - **Spacing / radius / elevation** (4px base, soft radii, warm shadows)
   - **Motion** + `prefers-reduced-motion`
   - **Core components** (shell, inbox row, AI summary, compose patterns)
   - **A11y** (contrast, touch targets, focus, AI not color-alone)
   - **Do & don’t**

2. **`MailMind-Brand-Guidelines.html`** (visual specimen) — self-contained reference page that:
   - Loads the same Google fonts as the app (Inter, Instrument Serif, JetBrains Mono)
   - Demonstrates **hero**, swatches, type scale, token rows, **inbox row + AI card + tab bar** (or current product equivalents)
   - Uses the **same CSS variable names** as `MailMind-Brand-Guidelines.md` where possible so engineers can map 1:1 into `app/globals.css`

## Process

1. **Gather:** product name, tagline, MVP scope (email-only), providers, AI differentiator, “never ship” list (e.g. no calendar).
2. **Draft MD first** — tables and rules engineers can grep.
3. **Mirror in HTML** — no drift between MD and HTML for hex/oklch values.
4. **Handoff to implementation** (same session or follow-up):
   - Read **`.claude/skills/brand-guidelines/SKILL.md`** and sync **`app/globals.css`** + **`tailwind.config.ts`** so the running app matches the doc.
   - If you only updated docs without code, add a spec or PR note: “tokens synced in commit …”.

## After generation — mandatory for everyone

Once the repo contains `MailMind-Brand-Guidelines.md` + `.html`, **all future UI work** in this codebase follows **`brand-guidelines`** (apply/consume). You do **not** need the human to repeat “use the brand guidelines” — `CLAUDE.md` and `ui-builder` already require it.

## Do not

- Put OAuth secrets, API keys, or customer data inside guideline files.
- Invent a second parallel palette in random components; one token set only.
