// AI Skill: draft a reply. Streams tokens.
// See specs/007.

import { z } from "zod";
import { openai, hasOpenAI, MODELS, estimateInputTokens } from "@/lib/ai/openai";

export const PROMPT_VERSION = "v1";

export const DraftInput = z.object({
  intent: z.string().max(280).optional(),
  tone: z.enum(["concise", "friendly", "formal"]).default("concise"),
  user: z.object({ name: z.string().optional(), email: z.string() }),
  message: z.object({
    subject: z.string(),
    from: z.string(),
    date: z.string(),
    bodyText: z.string(),
  }),
});
export type DraftInput = z.infer<typeof DraftInput>;

const SYSTEM = (tone: string) => `You are MailMind's reply assistant.

Objective: draft the body of a reply email in plain text. No greeting unless the user's intent says so. No signature. Be ${tone}.

Constraints:
- Produce ONLY the email body (no "Subject:", no quoted history).
- Stay grounded: do not invent facts not present in the original message.
- Match the requested tone strictly: concise = direct & under 80 words; friendly = warm & natural; formal = polished & professional.
- If the original message asks specific questions, answer each one explicitly.
- End with one short closing line (e.g., "Thanks,") — no name.`;

export interface DraftChunk {
  type: "delta" | "done" | "error" | "degraded";
  text?: string;
  error?: string;
}

export async function* runStream(input: DraftInput): AsyncGenerator<DraftChunk> {
  const parsed = DraftInput.parse(input);

  if (!hasOpenAI()) {
    yield { type: "degraded" };
    yield { type: "done" };
    return;
  }

  const body = parsed.message.bodyText.slice(0, 6_000);
  const userMessage = [
    parsed.intent ? `User intent: ${parsed.intent}` : "User intent: (none — infer from message)",
    "",
    "Original message to reply to:",
    `Subject: ${parsed.message.subject}`,
    `From: ${parsed.message.from}`,
    `Date: ${parsed.message.date}`,
    "",
    body,
  ].join("\n");

  const system = SYSTEM(parsed.tone);
  const est = estimateInputTokens(system) + estimateInputTokens(userMessage);
  if (est > 12_000) {
    yield { type: "error", error: "ai_too_large" };
    return;
  }

  try {
    const stream = await openai().chat.completions.create({
      model: MODELS.draft(),
      max_tokens: 800,
      temperature: 0.6,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { type: "delta", text: delta };
    }
    yield { type: "done" };
  } catch (err) {
    yield { type: "error", error: (err as Error).message ?? "stream_failed" };
  }
}
