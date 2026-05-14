# Spec 000 — Product Overview

## 1. Goal
**MailMind** is an AI-first email client delivered as a mobile-ready PWA. The MVP ships with **Gmail** as the single, fully-implemented provider, plus a fully-designed `MailProvider` abstraction (with stub implementations and skills) ready to extend to **Microsoft 365** and **IMAP** (Yahoo / AOL / iCloud / custom).

AI features powered by **OpenAI**: per-message summaries, suggested reply drafts, and inbox prioritization. The product proves that a small team operating Claude Code with strict agentic discipline can ship a polished, AI-native email slice in days, not months.

## 2. MVP scope (agreed with stakeholder)
- **In:** Gmail provider (full), unified-inbox UI (single Gmail account counts as "1 of N"), compose/reply/forward, archive/trash/label, search, all three AI features, PWA, automated tests.
- **Extension-ready (out of MVP, in repo):** Microsoft Graph + IMAP/SMTP — interfaces, stubs, OAuth skill, IMAP skill, presets, and route wiring are all in the codebase so the gap to v1.1 is small.
- **Explicitly out of scope (any version):** calendar, contacts, tasks, notes, native apps, push notifications via APNs/FCM, multi-tenant team workspaces, on-device AI.

## 3. User stories
- As a Gmail user, I sign in with Google in two clicks and see my inbox populated.
- As a busy user, I want a **2-sentence AI summary** of long messages so I can decide to respond in 5 seconds.
- As someone replying often, I want a **streamed AI reply draft** I can edit and send so I spend less time typing.
- As an overloaded inbox owner, I want **AI-tagged priorities** so I can deal with `urgent` first.
- As a mobile-first user, I want the app to **install as a PWA** and work offline for already-fetched messages.

## 4. Surface
- Routes: `/` (landing / login), `/inbox`, `/inbox/[id]`, `/compose`, `/search`, `/settings/accounts`.
- MVP account type: Gmail (OAuth). Other types appear in Settings as "extension targets" with a short note + link to the relevant spec.
- Components: `MessageList`, `MessageRow`, `MessageView`, `ComposeForm`, `AccountSwitcher` (single-account behaves as identity badge), `SummaryCard`, `DraftSuggestion`, `PriorityBadge`.

## 5. Data model
See `specs/001-architecture.md` + `prisma/schema.prisma`. Multi-account schema is in place from day one — adding providers later is data-model-zero-change.

## 6. Provider behavior
See `specs/002-auth-providers.md`.

## 7. AI behavior
OpenAI (`gpt-4o-mini` for summary/priority, `gpt-4o` for draft). See `specs/006`, `specs/007`, `specs/008`.

## 8. Edge cases & failure modes
- Gmail account is revoked or expired → show a reconnect banner; inbox renders empty state, not crash.
- AI key missing or 429 → "AI offline" badge, no crash; the email client itself is fully functional.
- Very large messages (>1 MB body) → truncate to 8k chars before AI calls.

## 9. Acceptance criteria
1. User can sign in with Google and land in a populated inbox.
2. Inbox lists Gmail messages, sorted by date desc, with pagination.
3. Clicking a message opens a detail view with sanitized HTML and an AI summary card.
4. User can compose, reply (with streamed AI draft), reply-all, forward, archive, trash, label.
5. Search returns Gmail results.
6. PWA is installable (manifest + service worker).
7. The app works (UI functional, no AI features) without `OPENAI_API_KEY`.
8. `npm run verify` is green; at least one E2E test passes.
9. `lib/providers/MicrosoftProvider.ts` and `lib/providers/ImapProvider.ts` exist and implement `MailProvider`, demonstrating the extension path.

## 10. Tests to add
Covered in each downstream spec.

## 11. Open questions
- Should we offer "Reply" as a one-click streamed draft, or behind a separate "Suggest reply" button? **Decision:** auto-stream on Reply; user can interrupt by typing.

## 12. Status
`approved`
