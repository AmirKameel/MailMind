---
name: imap-connection
description: How to connect to and operate against IMAP servers (Yahoo, AOL, iCloud, custom) using imapflow + nodemailer for SMTP send. Use when implementing or debugging the ImapProvider, handling auth, IDLE, mailbox listing, fetch, append, and connection pooling.
---

# Skill — IMAP / SMTP connections

This skill captures the patterns that survive in production for IMAP (read/modify) and SMTP (send) — the two halves of the IMAP path in MailMind.

## Library choices (locked)
- **IMAP**: [`imapflow`](https://imapflow.com/) — actively maintained, promise-based, supports IDLE, NOOP, MOVE, SEARCH.
- **Send (SMTP)**: [`nodemailer`](https://www.nodemailer.com/).
- **Parse**: [`mailparser`](https://nodemailer.com/extras/mailparser/) — for converting raw RFC822 to a structured object.

## Connection lifecycle
Serverless functions are short-lived; do **not** keep IMAP connections alive across requests. Open → operate → logout, every request.

```ts
import { ImapFlow } from "imapflow";

async function withImap<T>(creds: ImapCreds, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
    logger: false, // never log; PII
    socketTimeout: 30_000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}
```

## Connection presets (well-known providers)

| Provider | IMAP host | Port | SMTP host | Port | Notes |
|---|---|---|---|---|---|
| Yahoo | `imap.mail.yahoo.com` | 993 | `smtp.mail.yahoo.com` | 465 | Requires "app password" |
| AOL | `imap.aol.com` | 993 | `smtp.aol.com` | 465 | Requires "app password" |
| iCloud | `imap.mail.me.com` | 993 | `smtp.mail.me.com` | 587 (STARTTLS) | App-specific password |
| Fastmail | `imap.fastmail.com` | 993 | `smtp.fastmail.com` | 465 | App password |
| Gmail (legacy) | `imap.gmail.com` | 993 | `smtp.gmail.com` | 465 | App password if no OAuth |

## Listing messages efficiently

```ts
await client.mailboxOpen("INBOX");
const messages = client.fetch(
  { seen: undefined }, // all
  { uid: true, envelope: true, flags: true, internalDate: true, size: true },
  { uid: true },
);
for await (const m of messages) { /* map to MessageSummary */ }
```

Pagination: use UID windows. Persist the highest UID per (account, mailbox) and walk backwards in pages of 50.

## Body fetch

```ts
const { content } = await client.download(uid, undefined, { uid: true });
const parsed = await simpleParser(content); // mailparser
```

Cache the parsed result; raw RFC822 fetches are expensive.

## Mutations
- `client.messageFlagsAdd(uid, ["\\Seen"], { uid: true })` — mark read.
- `client.messageMove(uid, "Archive", { uid: true })` — archive (create the folder if missing).
- `client.messageMove(uid, "Trash", { uid: true })` — delete (move to Trash).
- Custom labels → custom folders on IMAP. MailMind treats labels and folders as the same `Label` type, with `kind: "system" | "user"`.

## SMTP send
```ts
const transport = nodemailer.createTransport({
  host: creds.smtpHost,
  port: creds.smtpPort,
  secure: creds.smtpPort === 465,
  auth: { user: creds.user, pass: creds.pass },
});
await transport.sendMail({ from, to, subject, html, text, inReplyTo, references });
```
After sending, **append** the sent message to the IMAP "Sent" folder so it shows up there too:
```ts
await client.append("Sent", builtRfc822, ["\\Seen"]);
```

## Search
Use IMAP `SEARCH` for server-side query when possible:
```ts
const uids = await client.search({ from: "alice@", text: "invoice", since: lastMonth }, { uid: true });
```
Avoid SEARCH on huge mailboxes without date bounds — it's O(mailbox size) server-side.

## Failure modes & remediation
| Symptom | Likely cause | Fix |
|---|---|---|
| `AUTHENTICATIONFAILED` | Wrong password / app-password required | Show the user the provider-specific app-password URL. |
| TLS errors on Yahoo | Old cipher suite | Set `secure: true` and rely on Node's default ciphers. Do **not** disable cert validation. |
| Long mailbox sync hangs | Fetching bodies in inbox list | Don't. Fetch envelopes only; bodies on demand. |
| Random disconnects | Idle timeout | Reconnect with backoff; serverless = open per request anyway. |

## Security
- IMAP passwords are encrypted with AES-256-GCM in `lib/crypto.ts` before write. The DB never sees plaintext.
- The encryption key is `CREDENTIAL_ENCRYPTION_KEY` (32 bytes base64), separate from `AUTH_SECRET`.
- Decryption only inside server actions or API route handlers, never in middleware that touches the edge runtime (Node-only).

## Checklist
- [ ] Connection opened and closed per request.
- [ ] No logging of `auth.pass` or raw RFC822 anywhere.
- [ ] Errors mapped to `ProviderError`.
- [ ] Sent messages appended to "Sent" folder.
- [ ] Pagination uses UID windows.
