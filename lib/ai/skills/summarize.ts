// AI Skill: summarize an email message.
// See specs/006 + .claude/skills/openai-prompt-design/SKILL.md.

import { z } from "zod";
import { openai, hasOpenAI, MODELS, estimateInputTokens } from "@/lib/ai/openai";
import { cacheGet, cacheSet } from "@/lib/ai/cache";

export const PROMPT_VERSION = "v1";

export const SummarizeInput = z.object({
  emailAccountId: z.string(),
  messageId: z.string(),
  subject: z.string(),
  from: z.string(),
  date: z.string(),
  bodyText: z.string(),
  attachments: z
    .array(z.object({ filename: z.string(), contentType: z.string() }))
    .default([]),
});
export type SummarizeInput = z.infer<typeof SummarizeInput>;

export const SummarizeOutput = z.object({
  summary: z.string().max(320),
  bullets: z.array(z.string().max(120)).max(5).default([]),
  category: z.enum(["work", "personal", "promo", "notification", "newsletter", "other"]),
  urgency: z.enum(["high", "medium", "low"]),
  actionRequired: z.boolean(),
  degraded: z.boolean().optional(),
});
export type SummarizeOutput = z.infer<typeof SummarizeOutput>;

const SYSTEM = `You are MailMind's email summarizer.

Objective: given a single email message, return a tight structured summary the user can scan in 5 seconds.

Constraints:
- Respond with ONLY valid JSON matching the schema. No prose. No code fences.
- summary: 1-2 sentences, <=320 chars, factual, no hype.
- bullets: 0-5 short bullets (<=120 chars each) capturing concrete facts/requests; [] if none.
- category: one of work | personal | promo | notification | newsletter | other.
- urgency: high (action needed today), medium (this week), low (FYI).
- actionRequired: true if the message asks the recipient to do something.
- If a field is unknown, default it conservatively. Never invent facts.`;

const BODY_LIMIT_CHARS = 8_000;

export function fallback(input: SummarizeInput): SummarizeOutput {
  return {
    summary: (input.bodyText || input.subject).slice(0, 140),
    bullets: [],
    category: "other",
    urgency: "low",
    actionRequired: false,
    degraded: true,
  };
}

export async function run(input: SummarizeInput): Promise<SummarizeOutput> {
  const parsed = SummarizeInput.parse(input);

  const body = parsed.bodyText.slice(0, BODY_LIMIT_CHARS);
  const truncated = parsed.bodyText.length > BODY_LIMIT_CHARS;

  const userMessage = [
    `Subject: ${parsed.subject}`,
    `From: ${parsed.from}`,
    `Date: ${parsed.date}`,
    parsed.attachments.length
      ? `Attachments: ${parsed.attachments.map((a) => a.filename).join(", ")}`
      : "Attachments: (none)",
    "",
    truncated ? "[Body truncated to first 8000 chars]" : "Body:",
    body,
  ].join("\n");

  if (!hasOpenAI()) return fallback(parsed);

  const model = MODELS.summary();
  const cacheKey = {
    emailAccountId: parsed.emailAccountId,
    messageId: parsed.messageId,
    skill: "summarize",
    promptVersion: PROMPT_VERSION,
    model,
  };
  const hit = await cacheGet<SummarizeOutput>(cacheKey);
  if (hit) return hit;

  const est = estimateInputTokens(SYSTEM) + estimateInputTokens(userMessage);
  if (est > 10_000) throw new Error(`ai_too_large: estimated ${est} input tokens`);

  let raw = "";
  try {
    const resp = await openai().chat.completions.create({
      model,
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMessage },
      ],
    });
    raw = resp.choices[0]?.message?.content ?? "";
  } catch {
    return { ...fallback(parsed), degraded: true };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ...fallback(parsed), degraded: true };
  }

  const out = SummarizeOutput.safeParse(json);
  if (!out.success) return { ...fallback(parsed), degraded: true };

  await cacheSet(cacheKey, out.data);
  return out.data;
}
