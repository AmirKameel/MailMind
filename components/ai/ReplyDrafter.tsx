"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, X } from "lucide-react";

type Tone = "concise" | "friendly" | "formal";

interface Props {
  accountId: string;
  userEmail: string;
  message: {
    subject: string;
    from: string;
    date: string;
    bodyText: string;
    messageId: string;
    references: string[];
    replyTo?: { email: string };
  };
}

export function ReplyDrafter({ accountId, userEmail, message }: Props) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("concise");
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [sending, setSending] = useState<null | "ok" | "err" | "loading">(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    void startDraft(tone);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startDraft(t: Tone) {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setDraft("");
    setDegraded(false);
    setStreaming(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        signal: ctl.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tone: t,
          user: { email: userEmail },
          message: {
            subject: message.subject,
            from: message.from,
            date: message.date,
            bodyText: message.bodyText,
          },
        }),
      });
      if (!res.body) throw new Error("no_stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.startsWith("data: ") ? ev.slice(6) : ev;
          if (!line) continue;
          try {
            const chunk = JSON.parse(line) as
              | { type: "delta"; text: string }
              | { type: "done" }
              | { type: "error"; error: string }
              | { type: "degraded" };
            if (chunk.type === "delta" && chunk.text) setDraft((d) => d + chunk.text);
            else if (chunk.type === "degraded") setDegraded(true);
            else if (chunk.type === "error") setError(chunk.error);
          } catch {
            /* ignore malformed */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setStreaming(false);
    }
  }

  async function send() {
    setSending("loading");
    setError(null);
    try {
      const subject = message.subject.startsWith("Re:")
        ? message.subject
        : `Re: ${message.subject}`;
      const toEmail =
        message.replyTo?.email ?? extractEmail(message.from) ?? message.from;
      const refs = [...(message.references ?? []), message.messageId]
        .filter(Boolean)
        .join(" ");
      const fd = new FormData();
      fd.set("accountId", accountId);
      fd.set("to", toEmail);
      fd.set("subject", subject);
      fd.set("body", draft);
      fd.set("inReplyTo", message.messageId);
      fd.set("references", refs);
      const { sendMessageAction } = await import("@/app/compose/actions");
      const res = await sendMessageAction(fd);
      if (res.ok) setSending("ok");
      else {
        setSending("err");
        setError(res.error);
      }
    } catch (err) {
      setSending("err");
      setError((err as Error).message);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="outline" className="rounded-pill border-[color-mix(in_oklch,var(--ai)_28%,var(--border))] bg-[color-mix(in_oklch,var(--ai)_10%,var(--card))] text-ai-foreground hover:bg-[color-mix(in_oklch,var(--ai)_16%,var(--card))]">
        <Sparkles className="size-4 text-ai" /> reply with AI
      </Button>
    );
  }

  return (
    <div className="not-prose space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-ai" aria-hidden />
        <div className="text-sm font-semibold text-foreground">AI draft</div>
        {degraded && (
          <Badge variant="secondary" title="OPENAI_API_KEY missing">
            AI offline
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
          {(["concise", "friendly", "formal"] as Tone[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tone === t ? "default" : "outline"}
              className="min-h-9 rounded-pill capitalize"
              onClick={() => {
                setTone(t);
                void startDraft(t);
              }}
              disabled={streaming}
            >
              {t}
            </Button>
          ))}
          <Button
            size="icon"
            variant="ghost"
            className="min-h-11 min-w-11 rounded-pill"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={10}
        spellCheck
        placeholder={
          degraded
            ? "AI is offline. type your reply here."
            : streaming
              ? "drafting…"
              : "edit the draft, then send."
        }
        className="w-full min-h-[220px] resize-y rounded-md border border-input bg-background px-3 py-2.5 font-sans text-base leading-relaxed text-foreground shadow-inner outline-none transition-[border-color,box-shadow] duration-hover ease-out placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={send} disabled={sending === "loading" || !draft.trim()} className="rounded-pill shadow-md">
          <Send className="size-4" />
          {sending === "loading" ? "sending…" : "send"}
        </Button>
        {sending === "ok" && <span className="text-sm text-[var(--success)]">sent. nicely done.</span>}
        {sending === "err" && <span className="text-sm text-destructive">{error}</span>}
        {streaming && (
          <span className="text-meta text-muted-foreground" aria-live="polite">
            drafting…
          </span>
        )}
      </div>
    </div>
  );
}

function extractEmail(raw: string): string | null {
  const m = /<([^>]+@[^>]+)>/.exec(raw) ?? /([^\s<>"]+@[^\s<>"]+)/.exec(raw);
  return m?.[1] ?? null;
}
