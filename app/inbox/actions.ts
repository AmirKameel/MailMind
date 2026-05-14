"use server";

import type { EmailAccount } from "@prisma/client";
import { getProvider } from "@/lib/providers/registry";
import type { ListOptions, MessageSummary } from "@/lib/types";
import { log } from "@/lib/log";

export async function listUnifiedInbox(opts: {
  accounts: EmailAccount[];
  limit?: number;
  /** Gmail / IMAP folder id; omit for default inbox (Gmail: INBOX). */
  labelId?: string;
}): Promise<{
  items: MessageSummary[];
  errors: { accountId: string; reason: string }[];
}> {
  const limit = opts.limit ?? 30;
  const listOpts: ListOptions = { limit, ...(opts.labelId ? { labelId: opts.labelId } : {}) };

  const errors: { accountId: string; reason: string }[] = [];

  const settled = await Promise.allSettled(
    opts.accounts.map(async (acc) => {
      const provider = await getProvider(acc);
      const page = await provider.listMessages(listOpts);
      return page.items;
    }),
  );

  const all: MessageSummary[] = [];
  settled.forEach((r, i) => {
    const acc = opts.accounts[i];
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      const reason =
        r.reason instanceof Error
          ? `${acc.emailAddr} (${acc.provider}): ${r.reason.message}`
          : `${acc.emailAddr}: unknown error`;
      errors.push({ accountId: acc.id, reason });
      log.warn("inbox.provider_failed", { accountId: acc.id, provider: acc.provider });
    }
  });

  all.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { items: all.slice(0, limit), errors };
}
