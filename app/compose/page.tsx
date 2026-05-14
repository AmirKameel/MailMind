import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import { buildForwardBody } from "@/lib/inbox/forward-body";
import { AppShell } from "@/components/layout/AppShell";
import { ComposeForm } from "./ComposeForm";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{
    forwardAccountId?: string;
    forwardMessageId?: string;
  }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { forwardAccountId, forwardMessageId } = await searchParams;
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (accounts.length === 0) {
    redirect("/settings/accounts");
  }

  let composeDraft:
    | {
        accountId: string;
        subject: string;
        bodyText: string;
      }
    | undefined;

  if (forwardAccountId && forwardMessageId) {
    const account = accounts.find((a) => a.id === forwardAccountId);
    if (account) {
      try {
        const provider = await getProvider(account);
        const msg = await provider.getMessage(forwardMessageId);
        composeDraft = {
          accountId: account.id,
          subject: msg.subject.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`,
          bodyText: buildForwardBody(msg),
        };
      } catch {
        composeDraft = undefined;
      }
    }
  }

  const formKey =
    forwardAccountId && forwardMessageId
      ? `${forwardAccountId}:${forwardMessageId}`
      : "compose";

  return (
    <AppShell user={session.user}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4">
        <div>
          <h1 className="font-serif text-3xl tracking-[-0.02em] text-foreground md:text-4xl">compose</h1>
          <p className="mt-1 text-sm text-muted-foreground">send from one of your connected accounts.</p>
        </div>
        <ComposeForm
          key={formKey}
          accounts={accounts.map((a) => ({
            id: a.id,
            emailAddr: a.emailAddr,
            provider: a.provider,
          }))}
          composeDraft={composeDraft}
        />
      </div>
    </AppShell>
  );
}
