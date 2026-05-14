# Spec 003 — Unified Inbox

## 1. Goal
Present one chronological inbox across all the user's connected email accounts, with account-level filtering, infinite scroll, and a fast mobile experience.

## 2. Non-goals
- Threaded conversation view (specs/004 adds it within a single message detail; cross-thread grouping in inbox listing is v2).
- Drag-and-drop label/folder management.
- Bulk operations on > 50 messages.

## 3. User stories
- As a user with 3 accounts, I see a unified list of recent messages from all of them in date-descending order.
- As a user, I tap the account switcher and filter to "Gmail only".
- As a user on mobile, I infinite-scroll to load more messages without jank.
- As a user, I see at a glance which account each message belongs to (a colored dot per account).

## 4. Surface
- Route: `/inbox` (server component).
- Components:
  - `<InboxHeader>` — search input, account switcher.
  - `<MessageList>` — virtualized list (React Query infinite query).
  - `<MessageRow>` — sender, subject, snippet, AI priority badge, timestamp, account dot.
  - `<AccountSwitcher>` — popover listing accounts with toggle filters.
- API:
  - `GET /api/messages?accountId=…&cursor=…&limit=50` — returns one provider's page.
  - The server action `listUnifiedInbox(opts)` fans out to all enabled accounts in parallel and merges by date.

## 5. Data model
None new (read-only).

## 6. Provider behavior
- Each provider's `listMessages` returns `Page<MessageSummary>` with an opaque `nextCursor`.
- Fan-out: launch all providers in parallel, await each, merge by `internalDate desc`, slice top N.
- If one provider errors, the row is shown with a warning chip, not a blocking failure.

## 7. AI behavior
- The "priority" badge consumes the AI prioritization output (`specs/008`). If the badge is `pending`, render a neutral chip and fire a background job.

## 8. Edge cases & failure modes
- No accounts connected → empty state with a CTA to Settings.
- One account errors → show all others, mark the failing account with a banner.
- Stale account (token expired) → show a "Reconnect" inline action.
- Provider returns 0 messages → empty-state-per-account (not for the whole inbox).
- Very slow IMAP → enforce a 10 s per-provider timeout; show a "still loading" indicator if exceeded.

## 9. Acceptance criteria
1. With ≥ 2 accounts connected, `/inbox` renders messages from all of them merged by date in < 2 s P95.
2. Infinite scroll fetches the next page from each provider independently (cursor per account).
3. Toggling an account in the switcher updates the list without a full reload (client-side filter).
4. Each row shows: sender name, subject, snippet ≤ 120 chars, relative time, account dot, priority badge (if available).
5. Mobile @ 360 px: no horizontal scroll, touch targets ≥ 44 px.
6. Keyboard: `j`/`k` move selection; `Enter` opens; `e` archives.
7. When all providers return empty, render the documented empty state.

## 10. Tests
- Unit: `lib/inbox/merge.test.ts` — merging 3 sorted streams keeps date order.
- E2E: `tests/e2e/inbox.spec.ts` — loads inbox; navigates with `j` and `Enter`; renders mobile + desktop.

## 11. Open questions
- Should account dot colors be user-customizable? **Decision:** auto-assign deterministically from a fixed palette by `EmailAccount.id`. User-customizable in v2.

## 12. Status
`approved`
