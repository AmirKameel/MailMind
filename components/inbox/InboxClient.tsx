"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Label, MessageSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { colorForAccount, initials, relativeTime } from "@/lib/utils";
import { GMAIL_SYSTEM_LABEL_OPTIONS } from "@/lib/inbox/gmail-system-labels";
import { Inbox as InboxIcon, AlertCircle, Filter, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { PriorityBadge, type InboxPriority } from "./PriorityBadge";

type AccountChip = { id: string; emailAddr: string; provider: string };

type PriorityMap = Record<string, { priority: InboxPriority; reason: string }>;

function rowKey(m: MessageSummary): string {
  return `${m.accountId}:${m.id}`;
}

interface Props {
  userEmail: string;
  userName?: string | null;
  accounts: AccountChip[];
  items: MessageSummary[];
  errors: { accountId: string; reason: string }[];
  initialLabelId: string;
  labelsByAccount: { accountId: string; labels: Label[] }[];
}

export function InboxClient({
  userEmail,
  userName,
  accounts,
  items,
  errors,
  initialLabelId,
  labelsByAccount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [priorityFilter, setPriorityFilter] = useState<"all" | InboxPriority>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [priorities, setPriorities] = useState<PriorityMap>({});
  const [prioritiesStatus, setPrioritiesStatus] = useState<"idle" | "loading" | "ready" | "error">(() =>
    items.length > 0 ? "loading" : "ready",
  );

  const loadPriorities = useCallback(async () => {
    if (items.length === 0) {
      setPriorities({});
      setPrioritiesStatus("ready");
      return;
    }
    setPrioritiesStatus("loading");
    const byAccount = new Map<string, MessageSummary[]>();
    for (const m of items) {
      const list = byAccount.get(m.accountId) ?? [];
      list.push(m);
      byAccount.set(m.accountId, list);
    }
    const next: PriorityMap = {};
    let anyOk = false;
    try {
      for (const [accountId, msgs] of byAccount) {
        if (msgs.length === 0) continue;
        const res = await fetch("/api/ai/prioritize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            emailAccountId: accountId,
            user: { email: userEmail, name: userName ?? undefined },
            items: msgs.map((m) => ({
              id: m.id,
              subject: m.subject,
              from: m.from.name ?? m.from.email,
              snippet: m.snippet,
              date: m.date,
            })),
          }),
        });
        if (!res.ok) continue;
        anyOk = true;
        const data = (await res.json()) as {
          results: Array<{ id: string; priority: InboxPriority; reason: string }>;
        };
        for (const r of data.results) {
          next[`${accountId}:${r.id}`] = { priority: r.priority, reason: r.reason };
        }
      }
      setPriorities(next);
      setPrioritiesStatus(anyOk || Object.keys(next).length > 0 ? "ready" : "error");
    } catch {
      setPrioritiesStatus("error");
    }
  }, [items, userEmail, userName]);

  useEffect(() => {
    void loadPriorities();
  }, [loadPriorities]);

  const mailboxLabelValue = searchParams.get("labelId") ?? initialLabelId ?? "";

  const mailboxLabelOptions = useMemo(() => {
    if (accountFilter === "all") {
      return GMAIL_SYSTEM_LABEL_OPTIONS;
    }
    const row = labelsByAccount.find((x) => x.accountId === accountFilter);
    if (!row?.labels.length) return GMAIL_SYSTEM_LABEL_OPTIONS;
    const merged = new Map<string, string>();
    for (const o of GMAIL_SYSTEM_LABEL_OPTIONS) merged.set(o.id, o.name);
    for (const l of row.labels) merged.set(l.id, l.name);
    return [...merged.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accountFilter, labelsByAccount]);

  const applyMailboxLabel = useCallback(
    (nextId: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (nextId) p.set("labelId", nextId);
      else p.delete("labelId");
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const filtered = useMemo(() => {
    let list = [...items];
    if (accountFilter !== "all") {
      list = list.filter((m) => m.accountId === accountFilter);
    }
    if (unreadOnly) {
      list = list.filter((m) => m.unread);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const blob = `${m.subject} ${m.from.name ?? ""} ${m.from.email} ${m.snippet}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (priorityFilter !== "all" && prioritiesStatus !== "loading") {
      list = list.filter((m) => {
        const p = priorities[rowKey(m)]?.priority;
        return p === priorityFilter;
      });
    }
    list.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [items, accountFilter, unreadOnly, search, priorityFilter, priorities, prioritiesStatus, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-[-0.02em] text-foreground md:text-4xl">your inbox</h1>
          <p className="mt-1 text-meta text-muted-foreground">
            {accounts.length} account{accounts.length === 1 ? "" : "s"} · {items.length} loaded · {filtered.length}{" "}
            shown
            {prioritiesStatus === "loading" && (
              <span className="text-ai"> · sorting priorities…</span>
            )}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {accounts.map((a) => (
            <span
              key={a.id}
              title={`${a.emailAddr} (${a.provider})`}
              className={`size-2.5 rounded-full ${colorForAccount(a.id)}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/80 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="size-4 shrink-0" aria-hidden />
          <span className="text-meta uppercase tracking-[0.12em] text-muted-foreground">filters</span>
        </div>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-meta text-muted-foreground">
          <span>search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="subject, sender, snippet…"
            className="h-11 min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
          />
        </label>
        <label className="flex flex-col gap-1 text-meta text-muted-foreground">
          <span>date</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="h-11 min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="newest">newest first</option>
            <option value="oldest">oldest first</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-meta text-muted-foreground">
          <span>priority</span>
          <select
            value={priorityFilter}
            disabled={prioritiesStatus === "loading"}
            title={
              prioritiesStatus === "loading"
                ? "wait until AI finishes classifying messages"
                : "filter by AI-assigned priority"
            }
            onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
            className="h-11 min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="all">all</option>
            <option value="urgent">urgent</option>
            <option value="important">important</option>
            <option value="normal">normal</option>
            <option value="low">low</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-meta text-muted-foreground">
          <span>account</span>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="h-11 min-h-11 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="all">all accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emailAddr}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-meta text-muted-foreground">
          <span>mailbox</span>
          <select
            value={mailboxLabelValue}
            title="reloads the list from the server (Gmail label or IMAP folder name)"
            onChange={(e) => applyMailboxLabel(e.target.value)}
            className="h-11 min-h-11 min-w-[11rem] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="">inbox (default)</option>
            {mailboxLabelOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="size-4 rounded border border-input"
          />
          unread only
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 min-h-11 shrink-0 rounded-md border-border/80"
          disabled={prioritiesStatus === "loading"}
          onClick={() => void loadPriorities()}
        >
          {prioritiesStatus === "loading" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="size-4" aria-hidden />
          )}
          {prioritiesStatus === "loading" ? "working…" : "refresh AI"}
        </Button>
      </div>

      {prioritiesStatus === "loading" && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="relative flex items-start gap-3 overflow-hidden rounded-lg border border-border/60 bg-muted/50 px-4 py-3 text-sm shadow-sm before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-ai-glow before:opacity-90"
        >
          <Loader2 className="relative mt-0.5 size-5 shrink-0 animate-spin text-ai" aria-hidden />
          <div className="relative min-w-0 space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="size-4 text-ai" aria-hidden />
              sorting priorities…
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              this can take a few seconds. other filters still work.
            </p>
          </div>
        </div>
      )}

      {prioritiesStatus === "ready" && priorityFilter !== "all" && (
        <p className="text-xs text-muted-foreground">
          Showing messages tagged <span className="font-medium text-foreground">{priorityFilter}</span> by AI.
        </p>
      )}

      {errors.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            {errors.length} account{errors.length === 1 ? "" : "s"} had errors —{" "}
            <Link href="/settings/accounts" className="underline">
              review connections
            </Link>
            .
          </span>
        </div>
      )}

      {prioritiesStatus === "error" && (
        <p className="text-xs text-muted-foreground">
          AI priority could not be refreshed (check OPENAI_API_KEY). Inbox still works; filters by priority need a successful run.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card/60 px-6 py-14 text-center shadow-sm">
          <InboxIcon className="mx-auto size-9 text-muted-foreground/80" />
          <p className="mt-4 font-serif text-2xl italic tracking-[-0.02em] text-foreground md:text-3xl">
            {items.length === 0 ? "inbox zero. enjoy it." : "nothing matches."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length === 0
              ? "new threads will land here when they arrive."
              : "try loosening filters or picking another mailbox."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((m) => {
            const pr = priorities[rowKey(m)]?.priority;
            const reason = priorities[rowKey(m)]?.reason;
            return (
              <li key={rowKey(m)} className="list-none">
                <Link
                  href={`/inbox/${encodeURIComponent(m.id)}?accountId=${m.accountId}`}
                  className={`relative flex gap-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-[box-shadow,background-color] duration-hover ease-out hover:border-border hover:shadow-md ${
                    m.unread ? "shadow-[inset_4px_0_0_0_var(--primary)]" : ""
                  }`}
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-pill text-meta font-semibold ${colorForAccount(m.accountId)}`}
                    aria-hidden
                  >
                    {initials(m.from.name ?? m.from.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm ${
                          m.unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                        }`}
                      >
                        {m.from.name ?? m.from.email}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{relativeTime(m.date)}</span>
                    </div>
                    <div className={`truncate text-sm ${m.unread ? "" : "text-muted-foreground"}`}>{m.subject}</div>
                    <div className={`mt-0.5 line-clamp-2 text-sm leading-snug ${m.unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.snippet}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <PriorityBadge priority={pr ?? "pending"} reason={reason} />
                    {m.unread && (
                      <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-[0.08em]">
                        new
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
