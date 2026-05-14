import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { run, SummarizeInput, fallback } from "@/lib/ai/skills/summarize";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = SummarizeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "invalid_input" }, { status: 400 });
  }

  try {
    const out = await run(parsed.data);
    return NextResponse.json(out);
  } catch (err) {
    const msg = (err as Error).message ?? "unknown";
    if (msg.startsWith("ai_too_large")) {
      return NextResponse.json({ error: msg }, { status: 413 });
    }
    return NextResponse.json(fallback(parsed.data), { status: 200 });
  }
}
