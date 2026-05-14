// IMAP / SMTP implementation of MailProvider.
// See .claude/skills/imap-connection/SKILL.md.

import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import type {
  ComposeInput,
  Label,
  ListOptions,
  MessageDetail,
  MessageSummary,
  Page,
  SearchOptions,
} from "@/lib/types";
import { ProviderError } from "@/lib/types";
import type { MailProvider } from "./MailProvider";

export interface ImapCreds {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  user: string;
  pass: string;
}

interface ImapDeps {
  accountId: string;
  emailAddr: string;
  creds: ImapCreds;
}

/** imapflow envelope address typing varies by version; normalize at runtime. */
function imapEnvelopeEmail(addr: unknown): string {
  if (!addr || typeof addr !== "object") return "unknown";
  const o = addr as { address?: string; mailbox?: string; host?: string };
  if (typeof o.address === "string" && o.address.includes("@")) return o.address;
  if (typeof o.mailbox === "string" && typeof o.host === "string") return `${o.mailbox}@${o.host}`;
  return "unknown";
}

function imapEnvelopeName(addr: unknown): string | undefined {
  if (!addr || typeof addr !== "object") return undefined;
  const n = (addr as { name?: string }).name;
  return typeof n === "string" ? n : undefined;
}

function imapInternalDateIso(d: string | Date | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return new Date(d).toISOString();
  return new Date().toISOString();
}

export class ImapProvider implements MailProvider {
  readonly id = "imap" as const;
  readonly accountId: string;
  readonly emailAddr: string;
  private creds: ImapCreds;

  constructor(deps: ImapDeps) {
    this.accountId = deps.accountId;
    this.emailAddr = deps.emailAddr;
    this.creds = deps.creds;
  }

  async listMessages(opts: ListOptions = {}): Promise<Page<MessageSummary>> {
    return this.withClient(async (client) => {
      const mailbox = opts.labelId ?? "INBOX";
      const status = await client.mailboxOpen(mailbox);
      const total = status.exists;
      if (total === 0) return { items: [] };

      const limit = opts.limit ?? 50;
      const startCursor = opts.cursor ? Number(opts.cursor) : total;
      const from = Math.max(1, startCursor - limit + 1);
      const range = `${from}:${startCursor}`;

      const items: MessageSummary[] = [];
      for await (const m of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        size: true,
        bodyStructure: true,
      })) {
        items.push({
          id: String(m.uid),
          accountId: this.accountId,
          provider: "imap",
          subject: m.envelope?.subject ?? "(no subject)",
          from: m.envelope?.from?.[0]
            ? {
                name: imapEnvelopeName(m.envelope.from[0]),
                email: imapEnvelopeEmail(m.envelope.from[0]),
              }
            : { email: "unknown" },
          to: (m.envelope?.to ?? []).map((a) => ({
            name: imapEnvelopeName(a),
            email: imapEnvelopeEmail(a),
          })),
          snippet: m.envelope?.subject ?? "",
          date: imapInternalDateIso(m.internalDate),
          unread: !(m.flags ?? new Set()).has("\\Seen"),
          hasAttachments: hasAttachments(m.bodyStructure),
          labels: [mailbox],
        });
      }
      items.reverse(); // newest first
      const nextCursor = from > 1 ? String(from - 1) : undefined;
      return { items, nextCursor };
    });
  }

  async getMessage(_id: string): Promise<MessageDetail> {
    // TODO(provider:imap): full body fetch via download() + mailparser.
    throw new Error("ImapProvider.getMessage not implemented yet");
  }

  async sendMessage(_input: ComposeInput): Promise<{ id: string }> {
    // TODO(provider:imap): nodemailer send + append to "Sent".
    throw new Error("ImapProvider.sendMessage not implemented yet");
  }

  async markRead(id: string, read: boolean): Promise<void> {
    await this.withClient(async (client) => {
      await client.mailboxOpen("INBOX");
      if (read) await client.messageFlagsAdd(id, ["\\Seen"], { uid: true });
      else await client.messageFlagsRemove(id, ["\\Seen"], { uid: true });
    });
  }

  async archive(id: string): Promise<void> {
    await this.move(id, "Archive");
  }

  async trash(id: string): Promise<void> {
    await this.move(id, "Trash");
  }

  async addLabel(id: string, label: string): Promise<void> {
    await this.move(id, label);
  }

  async removeLabel(id: string, _label: string): Promise<void> {
    await this.move(id, "INBOX");
  }

  async listLabels(): Promise<Label[]> {
    return this.withClient(async (client) => {
      const tree = await client.list();
      return tree.map((m) => ({
        id: m.path,
        name: m.name,
        kind: m.specialUse ? "system" : "user",
      }));
    });
  }

  async search(query: string, opts: SearchOptions = {}): Promise<Page<MessageSummary>> {
    return this.withClient(async (client) => {
      await client.mailboxOpen("INBOX");
      const uids = (await client.search(
        { text: query },
        { uid: true },
      )) as number[];
      const limit = opts.limit ?? 25;
      const slice = uids.slice(-limit).reverse();
      const items: MessageSummary[] = [];
      for (const uid of slice) {
        for await (const m of client.fetch(String(uid), {
          uid: true,
          envelope: true,
          flags: true,
          internalDate: true,
        }, { uid: true })) {
          items.push({
            id: String(m.uid),
            accountId: this.accountId,
            provider: "imap",
            subject: m.envelope?.subject ?? "(no subject)",
            from: m.envelope?.from?.[0]
              ? {
                  name: imapEnvelopeName(m.envelope.from[0]),
                  email: imapEnvelopeEmail(m.envelope.from[0]),
                }
              : { email: "unknown" },
            to: [],
            snippet: m.envelope?.subject ?? "",
            date: imapInternalDateIso(m.internalDate),
            unread: !(m.flags ?? new Set()).has("\\Seen"),
            hasAttachments: false,
            labels: ["INBOX"],
          });
        }
      }
      return { items };
    });
  }

  private async move(id: string, dest: string) {
    await this.withClient(async (client) => {
      await client.mailboxOpen("INBOX");
      // Try to create destination folder if missing — ignore errors.
      try {
        await client.mailboxCreate(dest);
      } catch {
        /* exists or unsupported */
      }
      await client.messageMove(id, dest, { uid: true });
    });
  }

  private async withClient<T>(fn: (c: ImapFlow) => Promise<T>): Promise<T> {
    const client = new ImapFlow({
      host: this.creds.imapHost,
      port: this.creds.imapPort,
      secure: this.creds.imapSecure,
      auth: { user: this.creds.user, pass: this.creds.pass },
      logger: false,
      socketTimeout: 30_000,
    });
    try {
      await client.connect();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (/AUTHENTICATIONFAILED/i.test(msg)) {
        throw new ProviderError("auth", "IMAP auth failed", err);
      }
      throw new ProviderError("network", `IMAP connect failed: ${msg}`, err);
    }
    try {
      return await fn(client);
    } finally {
      try {
        await client.logout();
      } catch {
        /* ignore */
      }
    }
  }

  // exported as a static helper because compose flows live elsewhere
  static async smtpSend(creds: ImapCreds, opts: nodemailer.SendMailOptions): Promise<{ id: string }> {
    const transport = nodemailer.createTransport({
      host: creds.smtpHost,
      port: creds.smtpPort,
      secure: creds.smtpSecure,
      auth: { user: creds.user, pass: creds.pass },
    });
    const info = await transport.sendMail(opts);
    return { id: info.messageId };
  }
}

function hasAttachments(struct: unknown): boolean {
  if (!struct || typeof struct !== "object") return false;
  const s = struct as { childNodes?: unknown[]; disposition?: string };
  if (s.disposition === "attachment") return true;
  if (Array.isArray(s.childNodes)) {
    return s.childNodes.some((c) => hasAttachments(c));
  }
  return false;
}
