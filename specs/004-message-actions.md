# Spec 004 — Message detail & actions (compose / reply / forward / archive / trash / label)

## 1. Goal
Open a message, read it safely, and take any of the standard actions. Compose a new message from scratch, or reply / reply-all / forward to an existing thread, including across providers.

## 2. Non-goals
- Full thread reconstruction across providers (in-thread display from a single provider only for v1).
- Scheduled send.
- Snooze.

## 3. User stories
- As a user, I open a message and see a sanitized HTML body with no tracking pixels by default.
- As a user, I tap **Reply** and an AI-drafted response appears, which I can edit before sending.
- As a user, I **Reply All** and the recipient list is built correctly (To = sender; Cc = original recipients minus me).
- As a user, I **Forward**, the attachments come along, and the subject gets `Fwd:`.
- As a user, I **Archive** or **Trash** with one tap (or `e` / `#` on keyboard).
- As a user, I apply a **Label** (Gmail) or move to a **Folder** (Microsoft / IMAP) — same UI, normalized model.

## 4. Surface
- Route: `/inbox/[id]?accountId=…` — server component renders shell, client component renders body + actions.
- Components: `<MessageView>`, `<MessageActions>` (archive/trash/label/star), `<ComposeModal>`, `<DraftSuggestion>`.
- Server actions:
  - `markRead(accountId, messageId)`
  - `archive(accountId, messageId)`
  - `trash(accountId, messageId)`
  - `addLabel(accountId, messageId, label)`
  - `removeLabel(accountId, messageId, label)`
  - `sendMessage(accountId, ComposeInput)` (zod-validated)

## 5. Data model
None new.

## 6. Provider behavior

| Action | Gmail | Microsoft | IMAP |
|---|---|---|---|
| `markRead` | `users.messages.modify {remove: UNREAD}` | `PATCH /messages/{id} {isRead: true}` | `messageFlagsAdd \\Seen` |
| `archive` | remove `INBOX` label | move to `Archive` folder (create if missing) | move to `Archive` |
| `trash` | `users.messages.trash` | move to `Deleted Items` | move to `Trash` |
| `addLabel(L)` | `messages.modify {addLabelIds:[L]}` | move to folder `L` | move to folder `L` |
| `removeLabel(L)` | `messages.modify {removeLabelIds:[L]}` | move to `INBOX` | move to `INBOX` |
| `sendMessage` | `users.messages.send` | `POST /me/sendMail` | nodemailer + append to `Sent` |

Labels vs folders normalize to `Label = { id, name, kind: 'system' | 'user' }`.

## 7. AI behavior
- On opening a message: fire-and-forget `summarize` call (specs/006) and stream the result into a `<SummaryCard>`.
- On clicking **Reply**: invoke `draft` (specs/007). Stream tokens into the compose modal. The user can keep editing while it streams.

## 8. Edge cases & failure modes
- Sending without a recipient → block, show inline error.
- Reply-all where I'm the only recipient → fall back to Reply.
- Forward of an encrypted (S/MIME) message → strip encryption metadata, forward decrypted body.
- Attachment > 20 MB → refuse to attach; suggest a link.
- Network failure mid-send → show retry; mark message in `outbox` table (v2 — for v1 just retry once and surface error).
- HTML email with no plain-text part → render `parsed.html` after sanitization; fallback to a placeholder otherwise.

## 9. Acceptance criteria
1. Opening a message marks it read within 1 s.
2. HTML body sanitized; no script tags survive (assertable in unit test).
3. Remote `<img>` are blocked by default; user can opt-in per message.
4. Reply / Reply-all / Forward fill subject + recipients + `In-Reply-To` / `References` correctly.
5. Send works for Gmail, Microsoft, IMAP/SMTP accounts; sent message appears in the provider's "Sent" within 5 s.
6. Archive/trash/label actions are optimistic in the UI and rolled back on server error.
7. Keyboard shortcuts work: `r` reply, `a` reply-all, `f` forward, `e` archive, `#` trash, `l` label.

## 10. Tests
- Unit: `lib/email/build-reply.test.ts` — given a fixture `MessageDetail`, reply/reply-all/forward outputs are correct (subject, to, cc, headers).
- Unit: `lib/sanitize.test.ts` — strips `<script>`, neutralizes `onerror`, blocks remote `<img>` by default.
- E2E: open a fixture message, click Reply, assert compose modal contains drafted body.

## 11. Open questions
- Do we let users opt out of the "marked read on open" behavior? **Decision:** yes, expose a setting in v2; default on for v1.

## 12. Status
`approved`
