"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import { log } from "@/lib/log";

const ComposeFormSchema = z.object({
  accountId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
});

export async function sendMessageAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };

  const parsed = ComposeFormSchema.safeParse({
    accountId: formData.get("accountId"),
    to: formData.get("to"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    inReplyTo: formData.get("inReplyTo") || undefined,
    references: formData.get("references") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const account = await prisma.emailAccount.findFirst({
    where: { id: input.accountId, userId: session.user.id },
  });
  if (!account) return { ok: false, error: "Account not found" };

  try {
    const provider = await getProvider(account);
    const { id } = await provider.sendMessage({
      to: [{ email: input.to }],
      subject: input.subject,
      bodyText: input.body,
      inReplyTo: input.inReplyTo,
      references: input.references ? input.references.split(/\s+/).filter(Boolean) : undefined,
    });
    revalidatePath("/inbox");
    return { ok: true, id };
  } catch (err) {
    log.warn("compose.send_failed", { accountId: account.id, provider: account.provider });
    return { ok: false, error: (err as Error).message ?? "send_failed" };
  }
}
