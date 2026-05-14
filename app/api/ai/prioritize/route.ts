import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { run, PrioritizeInput, fallback } from "@/lib/ai/skills/prioritize";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PrioritizeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const out = await run(parsed.data);
    return NextResponse.json(out);
  } catch (err) {
    if ((err as Error).message?.startsWith("ai_too_large")) {
      return NextResponse.json({ error: (err as Error).message }, { status: 413 });
    }
    return NextResponse.json(fallback(parsed.data));
  }
}
