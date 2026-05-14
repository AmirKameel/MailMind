"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptString } from "@/lib/crypto";
import { presetFor } from "@/lib/providers/imap-presets";

const Input = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().positive().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().positive().optional(),
});

export async function addImapAccount(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };

  const parsed = Input.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    imapHost: formData.get("imapHost") || undefined,
    imapPort: formData.get("imapPort") || undefined,
    smtpHost: formData.get("smtpHost") || undefined,
    smtpPort: formData.get("smtpPort") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const preset = presetFor(input.email);
  const imapHost = input.imapHost ?? preset?.imapHost;
  const imapPort = input.imapPort ?? preset?.imapPort ?? 993;
  const smtpHost = input.smtpHost ?? preset?.smtpHost;
  const smtpPort = input.smtpPort ?? preset?.smtpPort ?? 465;
  const imapSecure = preset?.imapSecure ?? true;
  const smtpSecure = preset?.smtpSecure ?? smtpPort === 465;

  if (!imapHost || !smtpHost) {
    return {
      ok: false,
      error:
        "Unknown provider. Enter IMAP/SMTP host manually in Advanced.",
    };
  }

  // Dynamic import: imapflow → pino breaks some Next/Node stacks if loaded eagerly.
  const { ImapFlow } = await import("imapflow");

  // Probe IMAP connection before persisting.
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapSecure,
    auth: { user: input.email, pass: input.password },
    logger: false,
    socketTimeout: 15_000,
  });
  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/AUTHENTICATIONFAILED/i.test(msg)) {
      return {
        ok: false,
        error: preset?.appPasswordUrl
          ? `Auth failed. ${input.email.split("@")[1]} typically requires an app-password (${preset.appPasswordUrl}).`
          : "Auth failed. Check email + password.",
      };
    }
    return { ok: false, error: `IMAP probe failed: ${msg}` };
  }

  await prisma.emailAccount.create({
    data: {
      userId: session.user.id,
      provider: "imap",
      emailAddr: input.email,
      imapHost,
      imapPort,
      imapSecure,
      smtpHost,
      smtpPort,
      smtpSecure,
      imapUser: input.email,
      imapPassEnc: encryptString(input.password),
    },
  });

  return { ok: true };
}
