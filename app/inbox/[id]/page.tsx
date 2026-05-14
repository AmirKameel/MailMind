import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import { sanitizeEmailHtml } from "@/lib/sanitize";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/ai/SummaryCard";
import { ReplyDrafter } from "@/components/ai/ReplyDrafter";
import { MessageToolbar } from "@/components/inbox/MessageToolbar";
import { MessageLabels } from "@/components/inbox/MessageLabels";
import { ArrowLeft } from "lucide-react";
import type { Label, MessageDetail } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ accountId?: string }>;
}

export default async function MessagePage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const { accountId } = await searchParams;
  if (!accountId) notFound();

  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) notFound();

  let message: MessageDetail;
  let allLabels: Label[] = [];
  try {
    const provider = await getProvider(account);
    message = await provider.getMessage(decodeURIComponent(id));
    provider.markRead(decodeURIComponent(id), true).catch(() => undefined);
    try {
      allLabels = await provider.listLabels();
    } catch {
      allLabels = [];
    }
  } catch (err) {
    return (
      <AppShell user={session.user}>
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/inbox">
              <ArrowLeft className="size-4" /> Back to inbox
            </Link>
          </Button>
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
            <p className="font-semibold">Could not load this message.</p>
            <p className="mt-1 text-muted-foreground">{(err as Error).message}</p>
            <p className="mt-3 text-xs">
              Full message bodies for {account.provider} require provider-specific MIME walking
              which is the next implementation slice. See <code>specs/004-message-actions.md §6</code>.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const bodyHtml = message.bodyHtml ? sanitizeEmailHtml(message.bodyHtml) : null;

  return (
    <AppShell user={session.user}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-pill">
            <Link href="/inbox">
              <ArrowLeft className="size-4" /> back
            </Link>
          </Button>
          <MessageToolbar accountId={account.id} messageId={message.id} />
        </div>

        <article className="space-y-5">
          <header className="space-y-2">
            <h1 className="font-serif text-2xl leading-snug tracking-[-0.02em] text-foreground md:text-3xl">
              {message.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
              <Badge variant="outline" className="rounded-pill font-medium capitalize">
                {account.provider}
              </Badge>
              <span className="truncate">{message.from.name ?? message.from.email}</span>
              <span aria-hidden>·</span>
              <span>{new Date(message.date).toLocaleString()}</span>
            </div>
          </header>

          <MessageLabels
            accountId={account.id}
            messageId={message.id}
            activeLabelIds={message.labels}
            allLabels={allLabels}
          />

          <SummaryCard
            input={{
              emailAccountId: account.id,
              messageId: message.id,
              subject: message.subject,
              from: message.from.email,
              date: message.date,
              bodyText: message.bodyText.slice(0, 8000),
              attachments: message.attachments.map((a) => ({
                filename: a.filename,
                contentType: a.contentType,
              })),
            }}
          />

          <div className="prose prose-sm max-w-none rounded-lg border border-border/60 bg-card/80 p-5 shadow-sm dark:prose-invert">
            {bodyHtml ? (
              <div
                className="email-html [&_img]:max-w-full [&_table]:max-w-full"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {message.bodyText || "(no content)"}
              </pre>
            )}
          </div>

          <ReplyDrafter
            accountId={account.id}
            userEmail={session.user.email ?? ""}
            message={{
              subject: message.subject,
              from: message.from.email,
              date: message.date,
              bodyText: message.bodyText,
              messageId: message.messageId,
              references: message.references,
              replyTo: message.replyTo ? { email: message.replyTo.email } : undefined,
            }}
          />
        </article>
      </div>
    </AppShell>
  );
}
