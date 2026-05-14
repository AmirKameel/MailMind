import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Inbox as InboxIcon, Plus, AlertCircle } from "lucide-react";
import { InboxClient } from "@/components/inbox/InboxClient";
import { listUnifiedInbox } from "./actions";
import type { Label } from "@/lib/types";

export const metadata = { title: "Inbox" };

interface PageProps {
  searchParams: Promise<{ labelId?: string }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { labelId } = await searchParams;

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell user={session.user}>
      <InboxBody accounts={accounts} session={session} labelId={labelId} />
    </AppShell>
  );
}

async function InboxBody({
  accounts,
  session,
  labelId,
}: {
  accounts: Awaited<ReturnType<typeof prisma.emailAccount.findMany>>;
  session: Session;
  labelId?: string;
}) {
  if (accounts.length === 0) return <EmptyAccountsState />;

  const labelsByAccount: { accountId: string; labels: Label[] }[] = await Promise.all(
    accounts.map(async (acc) => {
      try {
        const provider = await getProvider(acc);
        const labels = await provider.listLabels();
        return { accountId: acc.id, labels };
      } catch {
        return { accountId: acc.id, labels: [] as Label[] };
      }
    }),
  );

  const { items, errors } = await listUnifiedInbox({
    accounts,
    limit: 80,
    labelId: labelId?.trim() || undefined,
  });

  if (items.length === 0 && errors.length === accounts.length) {
    return <AllErroredState errors={errors} />;
  }

  return (
    <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading inbox…</div>}>
      <InboxClient
        userEmail={session.user.email ?? ""}
        userName={session.user.name}
        accounts={accounts.map((a) => ({
          id: a.id,
          emailAddr: a.emailAddr,
          provider: a.provider,
        }))}
        items={items}
        errors={errors}
        initialLabelId={labelId?.trim() ?? ""}
        labelsByAccount={labelsByAccount}
      />
    </Suspense>
  );
}

function EmptyAccountsState() {
  return (
    <div className="grid place-items-center py-20">
      <div className="max-w-md text-center">
        <InboxIcon className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No email accounts yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect Gmail, Microsoft 365, or any IMAP account to see your unified inbox.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link href="/settings/accounts">
              <Plus className="size-4" /> Add an account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AllErroredState({ errors }: { errors: { accountId: string; reason: string }[] }) {
  return (
    <div className="grid place-items-center py-20">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto size-10 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold">We couldn&apos;t reach your accounts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          All connected accounts returned errors. This usually means a token needs to be refreshed.
        </p>
        <pre className="mt-4 rounded-lg border bg-muted p-3 text-left text-xs">
          {errors.map((e) => `• ${e.reason}`).join("\n")}
        </pre>
        <div className="mt-5">
          <Button asChild>
            <Link href="/settings/accounts">Manage accounts</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
