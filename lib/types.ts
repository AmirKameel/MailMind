// Shared, provider-agnostic types used by the UI and the lib/ai layer.
// See specs/001 §6 and CLAUDE.md §6.

export type ProviderId = "gmail" | "microsoft" | "imap";

export type Result<T, E = ProviderError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export class ProviderError extends Error {
  constructor(
    public readonly kind:
      | "auth"
      | "rate_limited"
      | "not_found"
      | "network"
      | "validation"
      | "unknown",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export type Address = { name?: string; email: string };

export type LabelKind = "system" | "user";
export interface Label {
  id: string;
  name: string;
  kind: LabelKind;
  unread?: number;
  total?: number;
}

export interface MessageSummary {
  id: string;
  threadId?: string;
  accountId: string;
  provider: ProviderId;
  subject: string;
  from: Address;
  to: Address[];
  snippet: string;
  date: string; // ISO
  unread: boolean;
  hasAttachments: boolean;
  labels: string[]; // label/folder names
}

export interface MessageDetail extends MessageSummary {
  cc: Address[];
  bcc: Address[];
  replyTo?: Address;
  messageId: string;
  inReplyTo?: string;
  references: string[];
  bodyText: string;
  bodyHtml?: string;
  attachments: AttachmentMeta[];
}

export interface AttachmentMeta {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface ListOptions {
  labelId?: string;
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
}

export interface SearchOptions {
  limit?: number;
  cursor?: string;
}

export interface ComposeInput {
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: { filename: string; contentType: string; content: Buffer }[];
}
