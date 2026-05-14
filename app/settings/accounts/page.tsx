import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Lock } from "lucide-react";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell user={session.user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            MVP supports Gmail. Microsoft 365 and IMAP are extension-ready in the
            codebase — see <code>specs/002-auth-providers.md</code>.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">
            Connected
          </h2>
          {accounts.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              No accounts yet — add Gmail below.
            </div>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{a.emailAddr}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.provider} · added {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={a.status === "active" ? "normal" : "important"}>
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/settings/accounts" });
            }}
            className="rounded-xl border bg-card p-5"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Gmail <Badge variant="normal">MVP</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              OAuth via Google. Includes Gmail labels, modify, send.
            </p>
            <Button type="submit" className="mt-4 w-full" variant="outline">
              <Plus className="size-4" /> Connect Gmail
            </Button>
          </form>

          <div className="rounded-xl border border-dashed bg-muted/30 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Microsoft 365 / Outlook <Badge variant="secondary">Extension</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Provider class implemented (<code>lib/providers/MicrosoftProvider.ts</code>).
              Enable by uncommenting the Microsoft block in{" "}
              <code>lib/auth.ts</code> and setting the Microsoft env vars.
            </p>
            <Button className="mt-4 w-full" variant="outline" disabled>
              <Lock className="size-4" /> Enable post-MVP
            </Button>
          </div>

          <div className="rounded-xl border border-dashed bg-muted/30 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              IMAP / SMTP <Badge variant="secondary">Extension</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Provider class implemented (<code>lib/providers/ImapProvider.ts</code>) with
              presets for Yahoo, AOL, iCloud, Fastmail. Add-account form lives at{" "}
              <code>app/settings/accounts/AddImapForm.tsx</code>.
            </p>
            <Button className="mt-4 w-full" variant="outline" disabled>
              <Lock className="size-4" /> Enable post-MVP
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-sm">
          <h2 className="font-semibold">Architecture proof</h2>
          <p className="mt-1 text-muted-foreground">
            The UI imports only the shared <code>MailProvider</code> interface (
            <code>lib/providers/MailProvider.ts</code>). Adding Microsoft or IMAP to the
            MVP is data-model-zero-change: flip the provider config and the inbox
            fan-out picks them up automatically (see{" "}
            <code>app/inbox/actions.ts</code>).
          </p>
        </section>
      </div>
    </AppShell>
  );
}
