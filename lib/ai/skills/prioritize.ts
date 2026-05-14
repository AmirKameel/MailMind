// AI Skill: batched inbox prioritization.
// See specs/008.

import { z } from "zod";
import { openai, hasOpenAI, MODELS, estimateInputTokens } from "@/lib/ai/openai";
import { cacheGet, cacheSet } from "@/lib/ai/cache";

export const PROMPT_VERSION = "v1";
const BATCH_SIZE = 20;

export const PrioritizeItem = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.string(),
  snippet: z.string(),
  date: z.string(),
});
export type PrioritizeItem = z.infer<typeof PrioritizeItem>;

export const PrioritizeInput = z.object({
  emailAccountId: z.string(),
  user: z.object({ email: z.string(), name: z.string().optional() }),
  items: z.array(PrioritizeItem),
});
export type PrioritizeInput = z.infer<typeof PrioritizeInput>;

export const PriorityResult = z.object({
  id: z.string(),
  priority: z.enum(["urgent", "important", "normal", "low"]),
  reason: z.string().max(120),
});
export type PriorityResult = z.infer<typeof PriorityResult>;

export const PrioritizeOutput = z.object({ results: z.array(PriorityResult) });
export type PrioritizeOutput = z.infer<typeof PrioritizeOutput>;

const SYSTEM = `You are MailMind's inbox triage assistant.

Objective: assign a priority and short reason to each email in the batch.

Categories:
- urgent: explicit deadline today/tomorrow OR clearly time-critical (security alert, payment failure, manager asking now).
- important: requires the user's response/decision in the next few days.
- normal: ordinary correspondence, no clear urgency.
- low: newsletters, promotions, automated notifications.

Rules:
- Default to "normal" when unsure. Do NOT over-classify as urgent.
- "reason" must be a single sentence <=120 chars referencing concrete signals from subject/snippet/sender.
- Output ONLY valid JSON matching this exact shape:
  { "results": [ { "id": "string", "priority": "urgent|important|normal|low", "reason": "string" } ] }
- The "results" array MUST contain one entry for every item in the input, in the same order.`;

export function fallback(input: PrioritizeInput): PrioritizeOutput {
  return {
    results: input.items.map((i) => ({
      id: i.id,
      priority: "normal" as const,
      reason: "AI offline — defaulted to normal",
    })),
  };
}

export async function run(input: PrioritizeInput): Promise<PrioritizeOutput> {
  const parsed = PrioritizeInput.parse(input);
  if (parsed.items.length === 0) return { results: [] };
  if (!hasOpenAI()) return fallback(parsed);

  const model = MODELS.priority();
  const out: PriorityResult[] = [];

  const need: PrioritizeItem[] = [];
  for (const item of parsed.items) {
    const hit = await cacheGet<PriorityResult>({
      emailAccountId: parsed.emailAccountId,
      messageId: item.id,
      skill: "prioritize",
      promptVersion: PROMPT_VERSION,
      model,
    });
    if (hit) out.push(hit);
    else need.push(item);
  }

  for (let i = 0; i < need.length; i += BATCH_SIZE) {
    const batch = need.slice(i, i + BATCH_SIZE);
    const userMessage = JSON.stringify(
      {
        user: parsed.user,
        items: batch.map((b) => ({
          id: b.id,
          subject: b.subject,
          from: b.from,
          snippet: b.snippet.slice(0, 280),
          date: b.date,
        })),
      },
      null,
      0,
    );
    const est = estimateInputTokens(SYSTEM) + estimateInputTokens(userMessage);
    if (est > 16_000) throw new Error("ai_too_large");

    try {
      const resp = await openai().chat.completions.create({
        model,
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMessage },
        ],
      });
      const text = resp.choices[0]?.message?.content ?? "{}";
      const parsedResp = PrioritizeOutput.safeParse(JSON.parse(text));
      if (!parsedResp.success) {
        for (const item of batch) {
          out.push({ id: item.id, priority: "normal", reason: "AI parse error" });
        }
        continue;
      }
      const byResultId = new Map(parsedResp.data.results.map((r) => [r.id, r]));
      for (const item of batch) {
        const r =
          byResultId.get(item.id) ?? {
            id: item.id,
            priority: "normal" as const,
            reason: "AI omitted this item",
          };
        out.push(r);
        await cacheSet(
          {
            emailAccountId: parsed.emailAccountId,
            messageId: r.id,
            skill: "prioritize",
            promptVersion: PROMPT_VERSION,
            model,
          },
          r,
        );
      }
    } catch {
      for (const item of batch) {
        out.push({ id: item.id, priority: "normal", reason: "AI request failed" });
      }
    }
  }

  const byId = new Map(out.map((r) => [r.id, r]));
  return {
    results: parsed.items.map(
      (i) =>
        byId.get(i.id) ?? { id: i.id, priority: "normal" as const, reason: "no result" },
    ),
  };
}
