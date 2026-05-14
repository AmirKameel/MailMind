// Single OpenAI SDK entry point.
// All AI skills MUST go through here. See CLAUDE.md §7.

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function openai(): OpenAI {
  if (!hasOpenAI()) {
    throw new Error("OPENAI_API_KEY not set — call hasOpenAI() first and use fallback");
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      organization: process.env.OPENAI_ORGANIZATION,
      project: process.env.OPENAI_PROJECT,
    });
  }
  return _client;
}

export const MODELS = {
  summary: () => process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
  draft: () => process.env.OPENAI_DRAFT_MODEL ?? "gpt-4o",
  priority: () => process.env.OPENAI_PRIORITY_MODEL ?? "gpt-4o-mini",
};

export function estimateInputTokens(text: string): number {
  // Crude heuristic: ~4 chars per token for English. Good enough for budget guards.
  return Math.ceil(text.length / 4);
}
