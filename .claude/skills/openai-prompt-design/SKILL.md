---
name: openai-prompt-design
description: Prompt engineering patterns for OpenAI (gpt-4o family) inside MailMind — system-prompt structure, JSON-mode outputs, function calling, streaming, prompt versioning, and cost guards. Use whenever creating or modifying an AI skill under lib/ai/skills/.
---

# Skill — OpenAI prompt design (MailMind house style)

> Note: this skill applies to MailMind's **runtime AI features**, which call OpenAI.
> We **build** the codebase with Claude Code (the CLI tool) — different concern.

## Anatomy of a MailMind AI skill

A skill file (e.g. `lib/ai/skills/summarize.ts`) has exactly four sections in this order:

```ts
// 1. Imports
import { openai, hasOpenAI, MODELS } from "@/lib/ai/openai";
import { z } from "zod";
import { cacheGet, cacheSet } from "@/lib/ai/cache";

// 2. Versioning + types
export const PROMPT_VERSION = "v3"; // BUMP when you change the prompt
const Output = z.object({ summary: z.string(), bullets: z.array(z.string()).max(5), category: z.enum(["work","personal","promo","notification","newsletter","other"]) });
export type SummaryOutput = z.infer<typeof Output>;

// 3. System prompt
const SYSTEM = `…`;

// 4. run() — pure function, no side effects beyond the cache + API call
export async function run(input: SummaryInput): Promise<SummaryOutput> { … }
```

## System prompt template (use for every skill)

```text
You are <ROLE> inside MailMind, an AI email client.

Objective: <one sentence — single concrete deliverable>

Constraints:
- Respond ONLY with valid JSON matching the schema below.
- If a field is unknown, use "unknown" (string fields) or [] (arrays). Do NOT guess.
- Be concise. No prose outside JSON. No code fences.

Schema:
<paste the zod-equivalent schema here as JSON>

Examples:
<1–2 short examples — input → expected JSON>
```

## JSON-mode output (mandatory for structured skills)

Pass `response_format: { type: "json_object" }` (or `{ type: "json_schema", json_schema: { ... } }` for strict schema enforcement on newer models). Validate every response with `zod`.

```ts
const resp = await openai().chat.completions.create({
  model: MODELS.summary(),
  temperature: 0.2,
  max_tokens: 600,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: SYSTEM },
    { role: "user", content: userMessage },
  ],
});

const raw = resp.choices[0]?.message?.content ?? "";
let json: unknown;
try { json = JSON.parse(raw); }
catch { /* degrade to fallback() */ }

const parsed = Output.safeParse(json);
if (!parsed.success) /* degrade to fallback() */;
return parsed.data;
```

## Caching (mandatory)

Cache key = `${skillName}:${PROMPT_VERSION}:${modelName}:${sha256(canonicalInput)}`.

```ts
const key = { emailAccountId, messageId, skill: "summarize", promptVersion: PROMPT_VERSION, model };
const hit = await cacheGet(key);
if (hit) return hit;
const out = await callOpenAI(...);
await cacheSet(key, out);
return out;
```

Bumping `PROMPT_VERSION` invalidates all cached results for that skill — by design. Never edit a prompt without bumping.

## Streaming (drafts only)

For reply drafting, stream tokens to the user:

```ts
const stream = await openai().chat.completions.create({
  model: MODELS.draft(),
  stream: true,
  messages: [ ... ],
});
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) yield { type: "delta", text: delta };
}
```

Wrap in a Server-Sent Events route handler. Do not buffer.

## Function calling (only when needed)

If a skill must look something up (e.g., "find related threads"):

```ts
tools: [
  {
    type: "function",
    function: {
      name: "find_related",
      description: "Find emails in the user's inbox that match a free-text query.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
],
tool_choice: "auto",
```

- Cap iterations at 3 to prevent loops.
- Never let a tool call execute arbitrary code or shell.
- Validate tool arguments with `zod` before dispatching.

## Cost guard

Before any non-cached call:

```ts
const estTokens = Math.ceil(inputChars / 4);
if (estTokens > BUDGET[skill]) {
  throw new Error(`ai_too_large: estimated ${estTokens} > ${BUDGET[skill]}`);
}
```

Budgets (initial, tunable):
- `summarize`: 8k input — `gpt-4o-mini`.
- `draft`: 12k input — `gpt-4o`.
- `prioritize`: 16k input (batched) — `gpt-4o-mini`.

## Graceful degradation (no API key)

Every skill exports a `fallback` function that returns a "graceful offline" output:

```ts
export function fallback(input: SummarizeInput): SummarizeOutput {
  return {
    summary: input.bodyText.slice(0, 140) || input.subject,
    bullets: [],
    category: "other",
    urgency: "low",
    actionRequired: false,
    degraded: true,
  };
}
```

The skill's main entry checks for `OPENAI_API_KEY`; if missing or the call fails, it returns `fallback(input)` with `degraded: true` so the UI can show an "AI offline" badge.

## Prompt-writing don'ts

- ❌ Don't say "be helpful" — say what "helpful" means.
- ❌ Don't ask for "around 5 bullets" — say "at most 5 bullets".
- ❌ Don't use synonyms inside the prompt for the same field name.
- ❌ Don't put long context in the system prompt — put it in the user turn.
- ❌ Don't trust the model's JSON — always validate with zod.
- ❌ Don't use temperature > 0.3 for structured-output skills.

## Checklist (apply before merging an AI change)

- [ ] `PROMPT_VERSION` bumped.
- [ ] Zod schema present and asserted.
- [ ] JSON mode enabled for structured outputs.
- [ ] Cache used.
- [ ] Fallback implemented and tested with `OPENAI_API_KEY` unset.
- [ ] Snapshot test for rendered prompt with sample input.
- [ ] Cost guard in place.
- [ ] No PII or tokens in logs.
