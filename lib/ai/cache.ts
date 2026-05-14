// Cache for AI skill outputs. Keyed by (emailAccountId, messageId, skill, promptVersion, model).
// Backed by Prisma table AISummary (despite the name — it stores all skill outputs).

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

export interface CacheKey {
  emailAccountId: string;
  messageId: string;
  skill: string;
  promptVersion: string;
  model: string;
}

export function cacheKeyHash(input: unknown): string {
  const canonical = JSON.stringify(canonicalize(input));
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = canonicalize(obj[k]);
    return out;
  }
  return value;
}

export async function cacheGet<T>(key: CacheKey): Promise<T | null> {
  const row = await prisma.aISummary.findUnique({
    where: {
      emailAccountId_messageId_skill_promptVersion_model: {
        emailAccountId: key.emailAccountId,
        messageId: key.messageId,
        skill: key.skill,
        promptVersion: key.promptVersion,
        model: key.model,
      },
    },
  });
  return row ? (row.payload as T) : null;
}

export async function cacheSet<T>(key: CacheKey, payload: T): Promise<void> {
  await prisma.aISummary.upsert({
    where: {
      emailAccountId_messageId_skill_promptVersion_model: {
        emailAccountId: key.emailAccountId,
        messageId: key.messageId,
        skill: key.skill,
        promptVersion: key.promptVersion,
        model: key.model,
      },
    },
    update: { payload: payload as unknown as object },
    create: {
      ...key,
      payload: payload as unknown as object,
    },
  });
}
