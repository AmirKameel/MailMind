import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { colorForAccount, initials, relativeTime } from "@/lib/utils";
import type { MessageSummary } from "@/lib/types";
import { Search } from "lucide-react";

export const metadata = { title: "Search" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
  });

  const results: MessageSummary[] = [];
  if (q && q.length >= 2) {
    const settled = await Promise.allSettled(
      accounts.map(async (acc) => {
        const provider = await getProvider(acc);
        const page = await provider.search(q, { limit: 20 });
        return page.items;
      }),
    );
    for (const r of settled) if (r.status === "fulfilled") results.push(...r.value);
    results.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  return (
    <AppShell user={session.user}>
    <div className="space-y-4">
      <h1 className="font-serif text-3xl tracking-[-0.02em] text-foreground md:text-4xl">search</h1>

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="from:…  subject:…  or free text"
          className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
          autoFocus
        />
        <button
          type="submit"
          className="min-h-11 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition-[filter] duration-hover ease-out hover:brightness-105"
        >
          search
        </button>
      </form>

      {!q ? (
        <div className="rounded-lg border border-border/60 bg-card/80 p-10 text-center text-sm text-muted-foreground shadow-sm">
          <Search className="mx-auto size-8 text-muted-foreground/80" aria-hidden />
          <p className="mx-auto mt-3 max-w-md leading-relaxed">
            search across connected accounts. try <code className="font-mono text-[13px] text-foreground/90">from:</code>,{" "}
            <code className="font-mono text-[13px] text-foreground/90">subject:</code>,{" "}
            <code className="font-mono text-[13px] text-foreground/90">has:attachment</code>, or free text.
          </p>
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{`No results for "${q}".`}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((m) => (
            <li key={`${m.accountId}:${m.id}`} className="list-none">
              <Link
                href={`/inbox/${encodeURIComponent(m.id)}?accountId=${m.accountId}`}
                className="flex gap-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-[box-shadow,background-color] duration-hover ease-out hover:border-border hover:shadow-md"
              >
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-pill text-meta font-semibold ${colorForAccount(m.accountId)}`}
                  aria-hidden
                >
                  {initials(m.from.name ?? m.from.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {m.from.name ?? m.from.email}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {relativeTime(m.date)}
                    </span>
                  </div>
                  <div className="truncate text-sm">{m.subject}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.snippet}</div>
                </div>
                <Badge variant="outline" className="self-start">{m.provider}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
    </AppShell>
  );
}
