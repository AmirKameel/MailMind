# Spec 002 — Auth & Provider Connection

## 1. Goal
Let users sign in with Google OAuth and have the connection auto-create a Gmail `EmailAccount` row. The Microsoft and IMAP attachment flows are designed and stubbed in the codebase to prove extensibility; they are **not** wired into the MVP UI.

## 2. MVP boundary
- **In:** Google sign-in (Auth.js) with Gmail scopes; auto-create `EmailAccount(provider='gmail')` on first sign-in.
- **Designed but disabled in UI:** Microsoft (provider config commented out in `lib/auth.ts` for MVP), IMAP add-account form (kept in code, hidden behind a "coming soon" tile in Settings).
- **Out (any version):** email/password sign-up, magic-link, SAML/SSO.

## 3. User stories
- As a new user, I sign in with Google in two clicks and land in a populated inbox.
- (Extension target) As a user, I open Settings → Accounts and connect my Microsoft work email.
- (Extension target) As a user, I add a Yahoo account by entering email + app password; MailMind detects host/port automatically.

## 4. Surface
- `app/(auth)/login/page.tsx` — landing/login.
- `app/(app)/settings/accounts/page.tsx` — list + add accounts.
- `app/api/auth/[...nextauth]/route.ts` — Auth.js handler.
- Server action `addImapAccount(input)` — validates with zod, probes the IMAP server, encrypts the password, persists.

## 5. Data model
See `specs/001-architecture.md` — `User`, `Account`, `EmailAccount`.

## 6. Provider behavior

### Google
- Provider: Auth.js `Google()`.
- Scopes (see `.claude/skills/oauth-flow/SKILL.md`): `openid email profile gmail.modify gmail.send`.
- Params: `prompt=consent`, `access_type=offline`.
- On first sign-in, also create an `EmailAccount` row with `provider=gmail`.

### Microsoft 365
- Provider: Auth.js `MicrosoftEntraID()`.
- Scopes: `openid email profile offline_access Mail.ReadWrite Mail.Send User.Read`.
- Tenant: `common` (works for personal + work/school).
- Connection flow:
  - User clicks "Add Microsoft account" in Settings.
  - We initiate a `signIn("microsoft-entra-id", { redirectTo: "/settings/accounts" })`.
  - On success, link the resulting `Account` to a new `EmailAccount` row with `provider=microsoft`.

### IMAP
- Form fields: `emailAddr`, `password`, advanced toggle for host/port/security.
- Auto-detect host/port from a presets table (`.claude/skills/imap-connection/SKILL.md`).
- On submit:
  1. zod-validate the input.
  2. Try a single `ImapFlow.connect()` to verify credentials.
  3. AES-256-GCM encrypt the password with `CREDENTIAL_ENCRYPTION_KEY`.
  4. Persist to `EmailAccount`.

## 7. AI behavior
None.

## 8. Edge cases & failure modes
- Refresh token missing (Google) → force re-consent.
- Microsoft tenant requires admin consent → show a clear, branded error.
- IMAP wrong password → return a structured `{ error: "auth" }`, hint app-password URL when known.
- IMAP server presents an invalid cert → refuse; do **not** disable cert validation.
- User connects the same Google account twice → upsert by `(provider, providerAccountId)`.

## 9. Acceptance criteria (MVP)
1. Click "Sign in with Google" → returns to `/inbox` with a valid session.
2. After Google sign-in, an `EmailAccount(provider='gmail')` row exists for the user.
3. The Microsoft sign-in path is implemented in `lib/auth.ts` (provider block commented out by default; one-line uncomment to enable) and `specs/002-extensions.md` documents the activation.
4. The IMAP form file (`AddImapForm.tsx`) exists, validates, encrypts, persists — but is not rendered in MVP Settings UI.
5. The IMAP password column (when used) never contains plaintext (assertable via `lib/crypto.test.ts`).
6. Sign-out clears the session cookie and the user can no longer call `/api/messages`.

## 10. Tests
- Unit: `lib/crypto.test.ts` — round-trip encrypt/decrypt with the env key.
- Unit: `lib/providers/imap-presets.test.ts` — yahoo, aol, icloud, fastmail resolve correctly.
- E2E: `tests/e2e/login.spec.ts` — landing page renders; clicking "Sign in with Google" redirects to `accounts.google.com`.

## 11. Open questions
- App-password discovery URLs per provider: do we maintain them in MailMind or link to a public doc? **Decision:** maintain a small table in `lib/providers/imap-presets.ts` with a "help URL" per provider.

## 12. Status
`approved`
