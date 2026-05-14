// Microsoft Graph implementation of MailProvider.
// Uses direct fetch — no SDK bloat. See specs/002 and oauth-flow skill.

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

interface GraphDeps {
  accountId: string;
  emailAddr: string;
  accessToken: string;
}

const GRAPH = "https://graph.microsoft.com/v1.0";

export class MicrosoftProvider implements MailProvider {
  readonly id = "microsoft" as const;
  readonly accountId: string;
  readonly emailAddr: string;
  private token: string;

  constructor(deps: GraphDeps) {
    this.accountId = deps.accountId;
    this.emailAddr = deps.emailAddr;
    this.token = deps.accessToken;
  }

  async listMessages(opts: ListOptions = {}): Promise<Page<MessageSummary>> {
    void opts.labelId; // TODO(provider:microsoft): map labelId to Graph mailFolder
    const params = new URLSearchParams({
      $top: String(opts.limit ?? 50),
      $select: "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments",
      $orderby: "receivedDateTime desc",
    });
    if (opts.unreadOnly) params.set("$filter", "isRead eq false");
    const url = opts.cursor ?? `${GRAPH}/me/mailFolders/inbox/messages?${params}`;
    const data = await this.req<MsListResp>(url);
    return {
      items: data.value.map((m) => this.toSummary(m)),
      nextCursor: data["@odata.nextLink"] ?? undefined,
    };
  }

  async getMessage(_id: string): Promise<MessageDetail> {
    // TODO(provider:microsoft): full body extraction + attachments.
    throw new Error("MicrosoftProvider.getMessage not implemented yet");
  }

  async sendMessage(_input: ComposeInput): Promise<{ id: string }> {
    // TODO(provider:microsoft): POST /me/sendMail
    throw new Error("MicrosoftProvider.sendMessage not implemented yet");
  }

  async markRead(id: string, read: boolean): Promise<void> {
    await this.req(`${GRAPH}/me/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: read }),
    });
  }

  async archive(id: string): Promise<void> {
    await this.req(`${GRAPH}/me/messages/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: "archive" }),
    });
  }

  async trash(id: string): Promise<void> {
    await this.req(`${GRAPH}/me/messages/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: "deleteditems" }),
    });
  }

  async addLabel(id: string, label: string): Promise<void> {
    // Microsoft Graph doesn't have labels — interpret as move to folder named `label`.
    await this.req(`${GRAPH}/me/messages/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: label }),
    });
  }

  async removeLabel(id: string, _label: string): Promise<void> {
    // No-op: moving back to inbox is the "remove label" semantic.
    await this.req(`${GRAPH}/me/messages/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: "inbox" }),
    });
  }

  async listLabels(): Promise<Label[]> {
    const data = await this.req<MsFoldersResp>(`${GRAPH}/me/mailFolders?$top=50`);
    return data.value.map((f) => ({
      id: f.id,
      name: f.displayName,
      kind: ["inbox", "drafts", "sentitems", "deleteditems", "junkemail", "archive"].includes(
        f.displayName.toLowerCase(),
      )
        ? "system"
        : "user",
      unread: f.unreadItemCount,
      total: f.totalItemCount,
    }));
  }

  async search(query: string, opts: SearchOptions = {}): Promise<Page<MessageSummary>> {
    const params = new URLSearchParams({
      $search: `"${query.replace(/"/g, '\\"')}"`,
      $top: String(opts.limit ?? 25),
      $select: "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments",
    });
    const url = opts.cursor ?? `${GRAPH}/me/messages?${params}`;
    const data = await this.req<MsListResp>(url);
    return {
      items: data.value.map((m) => this.toSummary(m)),
      nextCursor: data["@odata.nextLink"] ?? undefined,
    };
  }

  private toSummary(m: MsMessage): MessageSummary {
    return {
      id: m.id,
      accountId: this.accountId,
      provider: "microsoft",
      subject: m.subject ?? "(no subject)",
      from: { name: m.from?.emailAddress?.name, email: m.from?.emailAddress?.address ?? "" },
      to: (m.toRecipients ?? []).map((r) => ({
        name: r.emailAddress.name,
        email: r.emailAddress.address,
      })),
      snippet: m.bodyPreview ?? "",
      date: m.receivedDateTime,
      unread: !m.isRead,
      hasAttachments: !!m.hasAttachments,
      labels: [],
    };
  }

  private async req<T = unknown>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new ProviderError("auth", `Microsoft Graph ${res.status}`);
      }
      if (res.status === 429) throw new ProviderError("rate_limited", "rate limited");
      if (res.status === 404) throw new ProviderError("not_found", "not found");
      throw new ProviderError("unknown", `Microsoft Graph ${res.status}: ${await res.text()}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

interface MsMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime: string;
  isRead?: boolean;
  hasAttachments?: boolean;
  from?: { emailAddress: { name?: string; address: string } };
  toRecipients?: { emailAddress: { name?: string; address: string } }[];
}
interface MsListResp {
  value: MsMessage[];
  "@odata.nextLink"?: string;
}
interface MsFoldersResp {
  value: { id: string; displayName: string; unreadItemCount?: number; totalItemCount?: number }[];
}
