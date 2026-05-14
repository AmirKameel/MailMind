---
name: oauth-flow
description: How to add or modify an OAuth provider (Google, Microsoft) in MailMind. Use when wiring Auth.js providers, requesting new scopes, persisting tokens, or refreshing access tokens. Includes scope reference and refresh-token persistence pattern.
---

# Skill — OAuth flow (Google + Microsoft)

This skill documents the **only** approved way to add or change an OAuth provider in MailMind.

## When to use this
- Adding a new OAuth provider.
- Adding scopes to an existing provider.
- Debugging "no refresh token returned" issues.
- Implementing token-refresh in `lib/auth.ts` callbacks.

## Where things live
- `lib/auth.ts` — NextAuth (Auth.js v5) config; the single source of truth.
- `prisma/schema.prisma` — `Account` model stores tokens (managed by `@auth/prisma-adapter`).
- `app/api/auth/[...nextauth]/route.ts` — auto-generated route handler.

## Required scopes

### Google (Gmail)
```
openid email profile
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
```

To ensure a refresh token is returned, request `prompt=consent` and `access_type=offline`:

```ts
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code",
      scope: [
        "openid", "email", "profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
      ].join(" "),
    },
  },
});
```

### Microsoft (Outlook / O365)
```
openid email profile offline_access
Mail.ReadWrite
Mail.Send
User.Read
```

```ts
MicrosoftEntraID({
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
  authorization: {
    params: {
      scope: "openid email profile offline_access Mail.ReadWrite Mail.Send User.Read",
    },
  },
});
```

## Refresh pattern

Inside Auth.js callbacks (`jwt` or via DB session strategy), keep tokens fresh:

```ts
async function refreshAccessToken(account: Account): Promise<Account> {
  if (account.expires_at && account.expires_at * 1000 > Date.now() + 60_000) {
    return account; // still valid
  }
  if (!account.refresh_token) throw new Error("no_refresh_token");

  const url =
    account.provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
      client_id: account.provider === "google"
        ? process.env.GOOGLE_CLIENT_ID!
        : process.env.MICROSOFT_CLIENT_ID!,
      client_secret: account.provider === "google"
        ? process.env.GOOGLE_CLIENT_SECRET!
        : process.env.MICROSOFT_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new ProviderError("auth", await res.text());
  const data = await res.json();
  // persist via prisma…
  return { ...account, access_token: data.access_token, expires_at: Math.floor(Date.now()/1000) + data.expires_in };
}
```

## Common pitfalls
1. **Missing refresh token on second login** — Google only returns it once. Force `prompt=consent` to get a fresh one. Always.
2. **Microsoft "AADSTS65001"** — admin consent missing. Either grant in Entra portal or use `prompt=admin_consent` once for a tenant admin.
3. **Token in client bundle** — Auth.js v5 keeps tokens out of the JWT by default when using the DB strategy. Use DB strategy + Prisma adapter.
4. **Redirect URI mismatch** — must be exactly `<NEXTAUTH_URL>/api/auth/callback/<provider>`.

## Checklist before opening a PR
- [ ] Scopes match the table above.
- [ ] Refresh path tested locally.
- [ ] No token logged anywhere (`grep -R "access_token" --include="*.ts" lib app`).
- [ ] Spec `specs/002-auth-providers.md` updated.
