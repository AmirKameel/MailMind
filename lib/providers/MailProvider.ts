// The ONLY interface the UI / API layer should know about.
// See CLAUDE.md §6 and specs/001-architecture.md.

import type {
  ComposeInput,
  Label,
  ListOptions,
  MessageDetail,
  MessageSummary,
  Page,
  ProviderId,
  SearchOptions,
} from "@/lib/types";

export interface MailProvider {
  readonly id: ProviderId;
  readonly accountId: string;
  readonly emailAddr: string;

  listMessages(opts?: ListOptions): Promise<Page<MessageSummary>>;
  getMessage(id: string): Promise<MessageDetail>;
  sendMessage(input: ComposeInput): Promise<{ id: string }>;

  markRead(id: string, read: boolean): Promise<void>;
  archive(id: string): Promise<void>;
  trash(id: string): Promise<void>;

  addLabel(id: string, label: string): Promise<void>;
  removeLabel(id: string, label: string): Promise<void>;
  listLabels(): Promise<Label[]>;

  search(query: string, opts?: SearchOptions): Promise<Page<MessageSummary>>;
}
