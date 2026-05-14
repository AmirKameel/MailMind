# Spec 005 — Search

## 1. Goal
Provide fast cross-account search using each provider's native search, merged into a unified result list.

## 2. Non-goals
- Local full-text index. (v2.)
- Saved searches / smart folders.

## 3. User stories
- As a user, I type a query in the header search and hit Enter → I see results from all connected accounts.
- As a user, I scope to one account with the account switcher.
- As a user, my search is debounced so I don't fire a query on every keystroke.

## 4. Surface
- Route: `/search?q=…&accountId=…&cursor=…`
- Component: `<SearchInput>` (debounced 300 ms), reuses `<MessageList>` to render results.
- Server action: `searchUnified({ q, accountId?, cursor? })`.

## 5. Provider behavior
- Gmail: `users.messages.list?q=…` (Gmail query syntax).
- Microsoft: `GET /me/messages?$search="…"` (KQL).
- IMAP: `client.search({...})` server-side; map our simple query (`from:`, `subject:`, free text) to imapflow's search object.

We expose a minimal MailMind query DSL: `from:`, `to:`, `subject:`, `has:attachment`, free text. Each provider translates it locally.

## 6. Edge cases
- Empty query → return nothing, render the search shell.
- Query of length 1 → require 2+ characters before firing.
- Provider doesn't support a clause → quietly drop that clause for that provider and tag the result chip with "filtered".

## 7. AI behavior
None for v1. (v2: natural-language → DSL via Claude.)

## 8. Acceptance criteria
1. Typing in the search input fires a server query 300 ms after the last keystroke.
2. Results are merged by date desc and rendered in `<MessageList>`.
3. Searching `from:taj@aptask.com` returns matching messages from each provider.
4. Result count per provider is shown above the merged list.

## 9. Tests
- Unit: `lib/search/dsl.test.ts` — parse `from:foo subject:"hello world" attachment"` correctly.
- Unit: `lib/providers/*/translateSearch.test.ts` — DSL → provider query.
- E2E: `tests/e2e/search.spec.ts` — search returns at least one result against fixture inboxes.

## 10. Open questions
None.

## 11. Status
`approved`
