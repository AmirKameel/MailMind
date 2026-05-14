import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MailMindLogo } from "@/components/brand/MailMindLogo";
import { ArrowRight, Inbox, Sparkles, Shield, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(720px,90vh)] bg-gradient-ai-glow opacity-70"
      />

      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-pill py-1 pl-1 pr-3 transition-colors duration-hover ease-out hover:bg-muted/80">
          <span className="grid size-9 place-items-center rounded-pill bg-gradient-hero text-primary-foreground shadow-md">
            <MailMindLogo className="size-[22px] text-primary-foreground" />
          </span>
          <span className="font-serif text-xl tracking-[-0.02em] text-foreground">MailMind</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-pill">
            <Link href="/login">sign in</Link>
          </Button>
          <Button asChild className="rounded-pill shadow-md">
            <Link href="/login">
              get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center md:gap-16 md:py-20">
        <div>
          <p className="text-meta font-semibold uppercase tracking-[0.12em] text-muted-foreground">AI-first email</p>
          <h1 className="mt-3 text-balance font-serif text-4xl leading-[1.08] tracking-[-0.02em] text-foreground md:text-6xl md:leading-[1.05]">
            inbox,
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">with a mind of its own.</span>
          </h1>
          <p className="mt-6 max-w-prose text-pretty text-muted-foreground md:text-[17px] md:leading-relaxed">
            one calm surface for Gmail (shipped), Microsoft 365, and IMAP — summaries when you want them, drafts when
            you need them, and a unified thread list that doesn&apos;t shout.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-pill px-6 shadow-md">
              <Link href="/login">
                start with Google <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-pill border-border/80 px-6">
              <Link href="/login">open the app</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-lg border border-border/60 bg-card/90 p-5 shadow-lg">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3 text-sm">
              <Inbox className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold text-foreground">unified inbox</span>
              <span className="ml-auto rounded-pill bg-muted px-2.5 py-1 text-meta font-medium text-[var(--success)]">
                3 connected
              </span>
            </div>
            <ul className="flex flex-col gap-2 pt-3">
              {SAMPLE.map((m) => (
                <li
                  key={m.subject}
                  className="flex gap-3 rounded-lg border border-border/50 bg-background/80 p-3 shadow-sm"
                >
                  <div className={`mt-0.5 size-2.5 shrink-0 rounded-full ${m.dot}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{m.from}</span>
                      <span className="ml-auto text-meta text-muted-foreground">{m.t}</span>
                    </div>
                    <div className="truncate text-sm text-foreground/90">{m.subject}</div>
                    <div className="truncate text-meta text-muted-foreground">{m.preview}</div>
                  </div>
                  <span
                    className={`mt-0.5 self-start rounded-pill px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${m.chip}`}
                  >
                    {m.tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container grid gap-5 pb-20 md:grid-cols-3 md:gap-6">
        <Feature
          icon={<Sparkles className="size-5 text-ai" aria-hidden />}
          title="summaries that respect your time"
          body="two-sentence gist plus bullets — cached so repeat visits feel instant."
        />
        <Feature
          icon={<Shield className="size-5 text-primary" aria-hidden />}
          title="security by default"
          body="OAuth never hits the browser. IMAP passwords encrypted at rest."
        />
        <Feature
          icon={<Smartphone className="size-5 text-accent-foreground" aria-hidden />}
          title="mobile-first PWA"
          body="install from the browser. offline shell for fast first paint."
        />
      </section>

      <footer className="container pb-12 text-center font-serif text-lg italic text-muted-foreground">
        read less, mean more.
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/70 p-5 shadow-sm">
      <div className="mb-3 grid size-10 place-items-center rounded-lg bg-muted text-primary shadow-inner">{icon}</div>
      <div className="text-[17px] font-semibold leading-snug text-foreground">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

const SAMPLE = [
  {
    from: "Taj Haslani",
    subject: "Re: MailMind take-home — built with Claude Code",
    preview: "live URL + CLAUDE.md + architecture + workflow attached…",
    t: "2m",
    dot: "bg-primary",
    tag: "urgent",
    chip: "bg-destructive/15 text-destructive",
  },
  {
    from: "GitHub",
    subject: "[PR] feat(ai/summary): cache key invalidation on PROMPT_VERSION",
    preview: "reviewer agent approved with 3 comments…",
    t: "1h",
    dot: "bg-success",
    tag: "important",
    chip: "bg-warning/25 text-[oklch(0.35_0.1_70)]",
  },
  {
    from: "Yahoo",
    subject: "Weekly summary — IMAP IDLE keep-alive notes",
    preview: "your iCloud account synced 42 new messages…",
    t: "Mon",
    dot: "bg-ai",
    tag: "low",
    chip: "bg-success/15 text-[oklch(0.32_0.1_160)]",
  },
];
