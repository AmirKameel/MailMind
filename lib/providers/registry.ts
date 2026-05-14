// Resolves a configured EmailAccount row to a live MailProvider instance.
// This is the ONE place that knows how to bridge stored credentials → SDKs.

import { google } from "googleapis";
import type { EmailAccount, Account as DbAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptString } from "@/lib/crypto";
import type { MailProvider } from "./MailProvider";
import { GmailProvider } from "./GmailProvider";
import { MicrosoftProvider } from "./MicrosoftProvider";
import { ProviderError } from "@/lib/types";

// ImapProvider pulls imapflow → pino (diagnostics_channel.tracingChannel). Load only for IMAP accounts
// so Gmail/Microsoft routes never evaluate that stack (fixes Next dev on some Node versions).

export async function getProvider(emailAccount: EmailAccount): Promise<MailProvider> {
  switch (emailAccount.provider) {
    case "gmail":
      return buildGmail(emailAccount);
    case "microsoft":
      return buildMicrosoft(emailAccount);
    case "imap":
      return buildImap(emailAccount);
    default:
      throw new ProviderError("validation", `unknown provider ${emailAccount.provider}`);
  }
}

async function findOAuthAccount(userId: string, provider: "google" | "microsoft-entra-id"): Promise<DbAccount> {
  const account = await prisma.account.findFirst({ where: { userId, provider } });
  if (!account) throw new ProviderError("auth", `${provider} account not connected`);
  return account;
}

async function buildGmail(ea: EmailAccount): Promise<GmailProvider> {
  const oauthAccount = await findOAuthAccount(ea.userId, "google");
  if (!oauthAccount.access_token) throw new ProviderError("auth", "no access token");
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({
    access_token: oauthAccount.access_token,
    refresh_token: oauthAccount.refresh_token ?? undefined,
    expiry_date: oauthAccount.expires_at ? oauthAccount.expires_at * 1000 : undefined,
  });
  // googleapis auto-refreshes; persist refreshed tokens back to DB.
  oauth2.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: { id: oauthAccount.id },
      data: {
        access_token: tokens.access_token ?? oauthAccount.access_token,
        refresh_token: tokens.refresh_token ?? oauthAccount.refresh_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : oauthAccount.expires_at,
      },
    });
  });
  return new GmailProvider({ accountId: ea.id, emailAddr: ea.emailAddr, oauth2 });
}

async function buildMicrosoft(ea: EmailAccount): Promise<MicrosoftProvider> {
  const oauthAccount = await findOAuthAccount(ea.userId, "microsoft-entra-id");
  let accessToken = oauthAccount.access_token;
  if (!accessToken) throw new ProviderError("auth", "no access token");
  if (oauthAccount.expires_at && oauthAccount.expires_at * 1000 < Date.now() + 60_000) {
    accessToken = await refreshMicrosoftToken(oauthAccount);
  }
  return new MicrosoftProvider({ accountId: ea.id, emailAddr: ea.emailAddr, accessToken });
}

async function refreshMicrosoftToken(account: DbAccount): Promise<string> {
  if (!account.refresh_token) throw new ProviderError("auth", "no refresh token");
  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: "openid email profile offline_access Mail.ReadWrite Mail.Send User.Read",
    }),
  });
  if (!res.ok) throw new ProviderError("auth", `refresh failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });
  return data.access_token;
}

async function buildImap(ea: EmailAccount): Promise<MailProvider> {
  if (
    !ea.imapHost ||
    !ea.imapPort ||
    !ea.smtpHost ||
    !ea.smtpPort ||
    !ea.imapUser ||
    !ea.imapPassEnc
  ) {
    throw new ProviderError("validation", "incomplete IMAP credentials");
  }
  const { ImapProvider } = await import("./ImapProvider");
  const pass = decryptString(ea.imapPassEnc);
  return new ImapProvider({
    accountId: ea.id,
    emailAddr: ea.emailAddr,
    creds: {
      imapHost: ea.imapHost,
      imapPort: ea.imapPort,
      imapSecure: ea.imapSecure ?? true,
      smtpHost: ea.smtpHost,
      smtpPort: ea.smtpPort,
      smtpSecure: ea.smtpSecure ?? true,
      user: ea.imapUser,
      pass,
    },
  });
}
