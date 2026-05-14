// Gmail implementation of MailProvider.
// Uses googleapis; UI never imports googleapis directly.

import { google, gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type {
  ComposeInput,
  Label,
  ListOptions,
  MessageDetail,
  MessageSummary,
  Page,
  SearchOptions,
  Address,
  AttachmentMeta,
} from "@/lib/types";
import { ProviderError } from "@/lib/types";
import type { MailProvider } from "./MailProvider";

interface GmailDeps {
  accountId: string;
  emailAddr: string;
  oauth2: OAuth2Client;
}

export class GmailProvider implements MailProvider {
  readonly id = "gmail" as const;
  readonly accountId: string;
  readonly emailAddr: string;
  private gmail: gmail_v1.Gmail;

  constructor(deps: GmailDeps) {
    this.accountId = deps.accountId;
    this.emailAddr = deps.emailAddr;
    this.gmail = google.gmail({ version: "v1", auth: deps.oauth2 });
  }

  async listMessages(opts: ListOptions = {}): Promise<Page<MessageSummary>> {
    try {
      const list = await this.gmail.users.messages.list({
        userId: "me",
        maxResults: opts.limit ?? 50,
        pageToken: opts.cursor,
        labelIds: opts.labelId ? [opts.labelId] : ["INBOX"],
        q: opts.unreadOnly ? "is:unread" : undefined,
      });
      const ids = list.data.messages ?? [];
      const items: MessageSummary[] = await Promise.all(
        ids.map((m) => this.fetchSummary(m.id!)),
      );
      return { items, nextCursor: list.data.nextPageToken ?? undefined };
    } catch (err) {
      throw mapGmailError(err);
    }
  }

  async getMessage(id: string): Promise<MessageDetail> {
    try {
      const res = await this.gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });
      const m = res.data;
      const headers = headerMap(m.payload?.headers ?? []);
      const { bodyText, bodyHtml, attachments } = walkParts(m.payload);

      return {
        id: m.id!,
        threadId: m.threadId ?? undefined,
        accountId: this.accountId,
        provider: "gmail",
        subject: headers["subject"] ?? "(no subject)",
        from: parseAddress(headers["from"] ?? ""),
        to: parseAddressList(headers["to"] ?? ""),
        cc: parseAddressList(headers["cc"] ?? ""),
        bcc: parseAddressList(headers["bcc"] ?? ""),
        replyTo: headers["reply-to"] ? parseAddress(headers["reply-to"]) : undefined,
        messageId: headers["message-id"] ?? m.id!,
        inReplyTo: headers["in-reply-to"] ?? undefined,
        references: (headers["references"] ?? "").split(/\s+/).filter(Boolean),
        snippet: m.snippet ?? "",
        date: new Date(Number(m.internalDate) || Date.now()).toISOString(),
        unread: (m.labelIds ?? []).includes("UNREAD"),
        hasAttachments: attachments.length > 0,
        labels: m.labelIds ?? [],
        bodyText: bodyText || stripHtml(bodyHtml ?? ""),
        bodyHtml: bodyHtml || undefined,
        attachments,
      };
    } catch (err) {
      throw mapGmailError(err);
    }
  }

  async sendMessage(input: ComposeInput): Promise<{ id: string }> {
    const raw = buildRfc822(input, this.emailAddr);
    const encoded = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    try {
      const res = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encoded },
      });
      return { id: res.data.id ?? "" };
    } catch (err) {
      throw mapGmailError(err);
    }
  }

  async markRead(id: string, read: boolean): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: read
        ? { removeLabelIds: ["UNREAD"] }
        : { addLabelIds: ["UNREAD"] },
    });
  }

  async archive(id: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: { removeLabelIds: ["INBOX"] },
    });
  }

  async trash(id: string): Promise<void> {
    await this.gmail.users.messages.trash({ userId: "me", id });
  }

  async addLabel(id: string, label: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: { addLabelIds: [label] },
    });
  }

  async removeLabel(id: string, label: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: { removeLabelIds: [label] },
    });
  }

  async listLabels(): Promise<Label[]> {
    const res = await this.gmail.users.labels.list({ userId: "me" });
    return (res.data.labels ?? []).map((l) => ({
      id: l.id!,
      name: l.name!,
      kind: l.type === "system" ? "system" : "user",
      unread: l.messagesUnread ?? undefined,
      total: l.messagesTotal ?? undefined,
    }));
  }

  async search(query: string, opts: SearchOptions = {}): Promise<Page<MessageSummary>> {
    const list = await this.gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: opts.limit ?? 25,
      pageToken: opts.cursor,
    });
    const ids = list.data.messages ?? [];
    const items = await Promise.all(ids.map((m) => this.fetchSummary(m.id!)));
    return { items, nextCursor: list.data.nextPageToken ?? undefined };
  }

  private async fetchSummary(id: string): Promise<MessageSummary> {
    const res = await this.gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject", "Date"],
    });
    const m = res.data;
    const headers = headerMap(m.payload?.headers ?? []);
    return {
      id: m.id!,
      threadId: m.threadId ?? undefined,
      accountId: this.accountId,
      provider: "gmail",
      subject: headers["subject"] ?? "(no subject)",
      from: parseAddress(headers["from"] ?? ""),
      to: parseAddressList(headers["to"] ?? ""),
      snippet: m.snippet ?? "",
      date: new Date(Number(m.internalDate) || Date.now()).toISOString(),
      unread: (m.labelIds ?? []).includes("UNREAD"),
      hasAttachments: (m.payload?.parts ?? []).some(
        (p) => (p.filename ?? "").length > 0,
      ),
      labels: m.labelIds ?? [],
    };
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function headerMap(headers: gmail_v1.Schema$MessagePartHeader[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    if (h.name && h.value) map[h.name.toLowerCase()] = h.value;
  }
  return map;
}

function parseAddress(raw: string): Address {
  const match = /^\s*(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?\s*$/.exec(raw);
  if (!match) return { email: raw };
  return { name: match[1]?.trim() || undefined, email: match[2] };
}

function parseAddressList(raw: string): Address[] {
  if (!raw) return [];
  return raw.split(",").map((s) => parseAddress(s.trim()));
}

function walkParts(payload: gmail_v1.Schema$MessagePart | undefined): {
  bodyText: string;
  bodyHtml: string;
  attachments: AttachmentMeta[];
} {
  const result = { bodyText: "", bodyHtml: "", attachments: [] as AttachmentMeta[] };
  if (!payload) return result;

  const stack: gmail_v1.Schema$MessagePart[] = [payload];
  while (stack.length) {
    const part = stack.pop()!;
    const mime = (part.mimeType ?? "").toLowerCase();

    if (part.filename && part.body?.attachmentId) {
      result.attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        contentType: mime,
        size: part.body.size ?? 0,
      });
      continue;
    }
    if (mime.startsWith("multipart/")) {
      for (const p of part.parts ?? []) stack.push(p);
      continue;
    }
    if (part.body?.data) {
      const text = Buffer.from(part.body.data, "base64").toString("utf8");
      if (mime === "text/plain" && !result.bodyText) result.bodyText = text;
      if (mime === "text/html" && !result.bodyHtml) result.bodyHtml = text;
    }
  }
  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRfc822(input: ComposeInput, fromEmail: string): string {
  const lines: string[] = [];
  lines.push(`From: ${fromEmail}`);
  lines.push(`To: ${input.to.map(fmtAddr).join(", ")}`);
  if (input.cc?.length) lines.push(`Cc: ${input.cc.map(fmtAddr).join(", ")}`);
  if (input.bcc?.length) lines.push(`Bcc: ${input.bcc.map(fmtAddr).join(", ")}`);
  lines.push(`Subject: ${encodeHeader(input.subject)}`);
  if (input.inReplyTo) lines.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references?.length) lines.push(`References: ${input.references.join(" ")}`);
  lines.push("MIME-Version: 1.0");

  if (input.bodyHtml) {
    const boundary = `=_mailmind_${Math.random().toString(36).slice(2)}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(input.bodyText);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(input.bodyHtml);
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(input.bodyText);
  }

  return lines.join("\r\n");
}

function fmtAddr(a: Address): string {
  return a.name ? `"${a.name.replace(/"/g, "")}" <${a.email}>` : a.email;
}

function encodeHeader(value: string): string {
  // Encode non-ASCII subjects per RFC 2047.
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function mapGmailError(err: unknown): ProviderError {
  const e = err as { code?: number; message?: string };
  if (e?.code === 401 || e?.code === 403) {
    return new ProviderError("auth", e.message ?? "auth failed", err);
  }
  if (e?.code === 429) return new ProviderError("rate_limited", "rate limited", err);
  if (e?.code === 404) return new ProviderError("not_found", "not found", err);
  return new ProviderError("unknown", e?.message ?? "gmail error", err);
}
