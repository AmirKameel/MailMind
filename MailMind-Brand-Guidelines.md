# MailMind — Brand & UI Guidelines

**Version 1.0**
*AI-first universal email, made to feel calm.*

---

## 1. Brand Essence

**Name:** MailMind
**Tagline:** *Inbox, with a mind of its own.*
**Category:** AI-first universal email client (mobile-ready PWA)
**Scope:** Email only — Gmail, Office 365, IMAP (Yahoo, AOL). No contacts, tasks, notes, or calendar.

### Brand pillars
1. **Calm** — email is stressful; MailMind is the antidote.
2. **Intelligent** — AI does the reading, drafting, and prioritizing.
3. **Universal** — one unified inbox, every provider.
4. **Adorable** — soft, warm, almost playful — never corporate.

### Voice & tone
- Friendly, lowercase-leaning, never shouty.
- Short sentences. Plain words.
- We say *"new thread"* not *"unread message"*. We say *"summary"* not *"AI-generated summary preview"*.
- Microcopy examples:
  - Empty inbox: *"inbox zero. enjoy it."*
  - AI summary loading: *"reading this for you…"*
  - Send: *"sent. nicely done."*
  - Error: *"that didn't go through. mind trying again?"*

---

## 2. Logo

**Mark:** A rounded envelope where the flap forms a gentle smile, with a soft "spark" dot above-right (the AI bit).

### Construction
- Geometry built on a 24×24 grid, 2px stroke, fully rounded joins.
- Spark dot = 1/4 the height of the envelope, placed at top-right outside the bounding box.

### Clear space
Minimum padding around the mark = height of the spark dot.

### Minimum sizes
- Favicon / app icon: 32×32 px
- UI nav: 24×24 px
- Print: 12 mm

### Don'ts
- Don't recolor outside the palette.
- Don't add drop shadows beyond the system shadow tokens.
- Don't rotate or skew.
- Don't place on busy photography without the soft-blur scrim.

---

## 3. Color System

All tokens defined in `oklch` for perceptual consistency. Light mode is the hero; dark mode is first-class.

### Core palette

| Token | Light (oklch) | Hex (≈) | Use |
|---|---|---|---|
| `--background` | `oklch(0.99 0.005 95)` | `#FCFBF7` | App background (warm off-white) |
| `--foreground` | `oklch(0.20 0.02 280)` | `#1F1E2A` | Primary text |
| `--primary` | `oklch(0.62 0.18 290)` | `#7B5BE0` | Lavender — brand, CTAs |
| `--primary-foreground` | `oklch(0.99 0.005 95)` | `#FCFBF7` | Text on primary |
| `--accent` | `oklch(0.85 0.13 75)` | `#F5C277` | Apricot — highlights, AI moments |
| `--accent-foreground` | `oklch(0.25 0.03 60)` | `#2A2218` | Text on accent |
| `--muted` | `oklch(0.96 0.01 280)` | `#F2F0F7` | Surface |
| `--muted-foreground` | `oklch(0.50 0.02 280)` | `#6F6C7E` | Secondary text |
| `--border` | `oklch(0.92 0.01 280)` | `#E6E3EE` | Hairlines |
| `--success` | `oklch(0.72 0.14 160)` | `#5BC79A` | Sent, synced |
| `--warning` | `oklch(0.78 0.15 70)` | `#E8B062` | Needs attention |
| `--destructive` | `oklch(0.60 0.20 25)` | `#D9544A` | Delete |

### AI accent (special)
`--ai`: `oklch(0.70 0.16 320)` ≈ `#C77BD9` — used **only** to mark AI-generated content (summaries, draft suggestions, priority badges). Never for chrome, never for plain CTAs.

### Dark mode

| Token | Dark (oklch) | Hex (≈) |
|---|---|---|
| `--background` | `oklch(0.18 0.02 280)` | `#1B1924` |
| `--foreground` | `oklch(0.96 0.01 95)` | `#F4F2EC` |
| `--primary` | `oklch(0.72 0.16 290)` | `#9B82EA` |
| `--accent` | `oklch(0.82 0.13 75)` | `#EFBA70` |
| `--ai` | `oklch(0.78 0.15 320)` | `#D89AE3` |
| `--muted` | `oklch(0.24 0.02 280)` | `#27243A` |
| `--border` | `oklch(0.30 0.02 280) / 60%` | — |

### Gradients
- `--gradient-hero`: `linear-gradient(135deg, oklch(0.62 0.18 290), oklch(0.70 0.16 320))` — used on onboarding, premium surfaces.
- `--gradient-ai-glow`: `radial-gradient(circle at 30% 20%, oklch(0.78 0.15 320 / 0.35), transparent 60%)` — soft halo behind AI content.

### Usage rules
- **Never** hardcode hex in components — use semantic tokens.
- Lavender primary should occupy ~10–15% of any screen. The rest is warm neutrals.
- AI pink/lavender accent is **earned**, not decorative.

---

## 4. Typography

Pairing: **Instrument Serif** (display) + **Inter** (UI/body).

| Role | Font | Weight | Size / Leading |
|---|---|---|---|
| Display (hero, empty states) | Instrument Serif | 400 (italic optional) | 48–72 / 1.05 |
| H1 | Instrument Serif | 400 | 32 / 1.15 |
| H2 | Inter | 600 | 22 / 1.3 |
| H3 / Section | Inter | 600 | 17 / 1.4 |
| Body | Inter | 400 | 15 / 1.55 |
| Small / Meta | Inter | 500 | 13 / 1.45 |
| Mono (snippets, code) | JetBrains Mono | 400 | 13 / 1.5 |

### Rules
- One serif moment per screen (usually the page title or empty state).
- Tracking: tighten display by `-0.02em`; body sits at default.
- No ALL CAPS except 11px badges with `+0.08em` tracking.

---

## 5. Spacing, Radius & Elevation

### Spacing scale (4px base)
`4, 8, 12, 16, 24, 32, 48, 64, 96`

### Radius
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Inline chips |
| `--radius-md` | 12px | Inputs, buttons |
| `--radius-lg` | 18px | Cards, message bubbles |
| `--radius-xl` | 28px | Modals, sheets |
| `--radius-pill` | 999px | Tags, account switcher |

MailMind is **soft** — default to `--radius-lg` for any container holding content.

### Shadows (warm, never gray)
- `--shadow-sm`: `0 1px 2px oklch(0.20 0.02 280 / 0.06)`
- `--shadow-md`: `0 8px 24px -8px oklch(0.20 0.02 280 / 0.10)`
- `--shadow-lg`: `0 24px 48px -16px oklch(0.62 0.18 290 / 0.20)` (lavender-tinted)
- `--shadow-ai`: `0 0 32px oklch(0.70 0.16 320 / 0.35)` (only on AI surfaces)

---

## 6. Iconography

- Library: **Lucide**, 1.75px stroke, rounded line caps.
- 20px in lists, 24px in nav, 16px inline with text.
- AI features get a custom **sparkle** glyph (4-point star, slightly tilted) — never use a robot, brain, or wand icon.

---

## 7. Motion

Email apps feel snappy when motion is restrained.

| Use | Duration | Easing |
|---|---|---|
| Hover / focus | 120ms | `ease-out` |
| Sheet / modal | 280ms | `cubic-bezier(0.32, 0.72, 0, 1)` (iOS spring) |
| List item enter | 240ms stagger 30ms | `ease-out` |
| AI summary reveal | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` with shimmer |
| Send animation | 600ms | envelope tucks + lavender trail |

Reduce-motion: respect `prefers-reduced-motion` — fade only.

---

## 8. Core UI Components

### App shell (mobile-first PWA)
- **Top bar (56px):** account avatar (left, opens switcher) · search (center, expands) · compose (right, lavender FAB-style pill).
- **Inbox list:** soft cards, 12px gap, no harsh dividers.
- **Bottom tab (mobile, 64px):** Inbox · Search · Labels. Three tabs only — we are email-only.
- **Floating compose:** lavender pill bottom-right, 56×56, with sparkle if "AI draft" is on.

### Email row
```
[avatar 36]  Sender name              ·  2:14 pm
             Subject line (medium)
             Preview snippet, two lines max…
             [label] [label]              [✦ priority]
```
- Unread: sender bolded, soft lavender 4px left bar.
- AI priority badge: small `--ai` chip with sparkle.

### AI Summary card
- Sits at top of any thread > 3 messages.
- Background: `--muted` with `--gradient-ai-glow` overlay.
- Sparkle icon + label *"summary"* in `--ai`.
- Body in serif italic, 15px, max 4 lines.
- Footer: *"based on 7 messages · regenerate"*.

### Compose sheet
- Full-height bottom sheet on mobile, centered modal on desktop.
- Fields stack with no boxes — just hairline separators.
- AI bar pinned above keyboard: `[✦ draft reply]` `[shorten]` `[friendlier]` `[translate]`.

### Account switcher
- Bottom sheet listing connected accounts with provider glyph (Gmail / Outlook / Yahoo / AOL / IMAP).
- "Unified inbox" pinned at top with stacked avatars.

---

## 9. Imagery & Illustration

- **Style:** soft gouache textures, warm gradients, never flat corporate vector.
- **Subject:** envelopes, paper planes, mailboxes, tiny gardens of letters.
- **Color:** stays inside the palette — lavender, apricot, cream.
- Empty states always pair an illustration with a serif one-liner.

---

## 10. Accessibility

- Minimum contrast: **AA** for body, **AAA** for headings where possible.
- Touch targets: 44×44 minimum.
- Focus ring: 2px `--primary` with 2px offset, never removed.
- All AI-generated content must be labeled with text + sparkle icon (not color alone).
- Full keyboard support: `j/k` navigate, `e` archive, `#` delete, `r` reply, `c` compose, `/` search.

---

## 11. Do & Don't

**Do**
- Lead with whitespace.
- Use serif for moments of meaning.
- Mark every AI moment with the sparkle + `--ai` color.
- Default to soft shadows and rounded corners.

**Don't**
- Don't use blue for primary — that's every other email app.
- Don't ship hard 1px gray dividers; use `--border` at 60% opacity.
- Don't wrap everything in cards — let the page breathe.
- Don't use robot/AI/brain emoji or icons.
- Don't add a calendar, tasks, contacts, or notes panel — ever.

---

*MailMind — read less, mean more.*
