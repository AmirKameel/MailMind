"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Input = {
  emailAccountId: string;
  messageId: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
  attachments: { filename: string; contentType: string }[];
};

type Summary = {
  summary: string;
  bullets: string[];
  category: string;
  urgency: "high" | "medium" | "low";
  actionRequired: boolean;
  degraded?: boolean;
};

export function SummaryCard({ input }: { input: Input }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = (await res.json()) as Partial<Summary> & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        if (typeof json.summary !== "string") {
          throw new Error(json.error ?? "Invalid summary response");
        }
        if (!aborted) setData(json as Summary);
      } catch (err) {
        if (!aborted) setError((err as Error).message);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [input.messageId, input.emailAccountId]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/60 shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-ai-glow opacity-80"
        aria-hidden
      />
      <div className="relative p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-ai" aria-hidden />
            <span className="text-meta font-semibold uppercase tracking-[0.1em] text-ai-foreground">
              summary
            </span>
            {data?.degraded && (
              <Badge variant="secondary" className="ml-1" title="OPENAI_API_KEY missing or call failed">
                AI offline
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="min-h-11 min-w-11 rounded-pill p-2 text-muted-foreground transition-colors duration-hover ease-out hover:bg-background/80 hover:text-foreground"
            aria-label={open ? "Collapse summary" : "Expand summary"}
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-3 text-sm">
            {error ? (
              <p className="text-destructive">that didn&apos;t load. {error}</p>
            ) : !data ? (
              <SummarySkeleton />
            ) : (
              <>
                <p className="font-serif text-lg italic leading-relaxed text-foreground md:text-[17px]">
                  {data.summary}
                </p>
                {data.bullets.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {data.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline">{data.category}</Badge>
                  <Badge
                    variant={
                      data.urgency === "high"
                        ? "urgent"
                        : data.urgency === "medium"
                          ? "important"
                          : "low"
                    }
                  >
                    {data.urgency}
                  </Badge>
                  {data.actionRequired && <Badge variant="important">action needed</Badge>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">reading this for you…</p>
      <div className="h-3 w-full rounded shimmer" />
      <div className="h-3 w-5/6 rounded shimmer" />
      <div className="h-3 w-3/5 rounded shimmer" />
    </div>
  );
}
