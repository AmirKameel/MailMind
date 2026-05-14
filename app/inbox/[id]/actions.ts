"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import { log } from "@/lib/log";

const Ids = z.object({
  accountId: z.string().min(1),
  messageId: z.string().min(1),
});

const LabelMut = Ids.extend({
  labelId: z.string().min(1),
});

async function resolveAccount(accountId: string, userId: string) {
  return prisma.emailAccount.findFirst({
    where: { id: accountId, userId },
  });
}

export async function archiveMessageAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = Ids.safeParse({
    accountId: formData.get("accountId"),
    messageId: formData.get("messageId"),
  });
  if (!parsed.success) return;

  const account = await resolveAccount(parsed.data.accountId, session.user.id);
  if (!account) return;

  try {
    const provider = await getProvider(account);
    await provider.archive(parsed.data.messageId);
  } catch (err) {
    log.warn("message.archive_failed", { accountId: account.id, messageId: parsed.data.messageId });
    throw err;
  }
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${encodeURIComponent(parsed.data.messageId)}`);
  redirect("/inbox");
}

export async function trashMessageAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = Ids.safeParse({
    accountId: formData.get("accountId"),
    messageId: formData.get("messageId"),
  });
  if (!parsed.success) return;

  const account = await resolveAccount(parsed.data.accountId, session.user.id);
  if (!account) return;

  try {
    const provider = await getProvider(account);
    await provider.trash(parsed.data.messageId);
  } catch (err) {
    log.warn("message.trash_failed", { accountId: account.id, messageId: parsed.data.messageId });
    throw err;
  }
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${encodeURIComponent(parsed.data.messageId)}`);
  redirect("/inbox");
}

export async function addMessageLabelAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };

  const parsed = LabelMut.safeParse({
    accountId: formData.get("accountId"),
    messageId: formData.get("messageId"),
    labelId: formData.get("labelId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const account = await resolveAccount(parsed.data.accountId, session.user.id);
  if (!account) return { ok: false, error: "Account not found" };

  try {
    const provider = await getProvider(account);
    await provider.addLabel(parsed.data.messageId, parsed.data.labelId);
    revalidatePath("/inbox");
    revalidatePath(`/inbox/${encodeURIComponent(parsed.data.messageId)}`);
    return { ok: true };
  } catch (err) {
    log.warn("message.add_label_failed", { accountId: account.id });
    return { ok: false, error: (err as Error).message ?? "add_label_failed" };
  }
}

export async function removeMessageLabelAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };

  const parsed = LabelMut.safeParse({
    accountId: formData.get("accountId"),
    messageId: formData.get("messageId"),
    labelId: formData.get("labelId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const account = await resolveAccount(parsed.data.accountId, session.user.id);
  if (!account) return { ok: false, error: "Account not found" };

  try {
    const provider = await getProvider(account);
    await provider.removeLabel(parsed.data.messageId, parsed.data.labelId);
    revalidatePath("/inbox");
    revalidatePath(`/inbox/${encodeURIComponent(parsed.data.messageId)}`);
    return { ok: true };
  } catch (err) {
    log.warn("message.remove_label_failed", { accountId: account.id });
    return { ok: false, error: (err as Error).message ?? "remove_label_failed" };
  }
}
