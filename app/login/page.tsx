import Link from "next/link";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MailMindLogo } from "@/components/brand/MailMindLogo";
import { ArrowLeft, Lock } from "lucide-react";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="min-h-dvh">
      <header className="container py-6">
        <Button asChild variant="ghost" size="sm" className="rounded-pill">
          <Link href="/">
            <ArrowLeft className="size-4" /> home
          </Link>
        </Button>
      </header>

      <section className="container grid place-items-center px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-lg">
          <div className="relative bg-gradient-hero px-6 py-10 text-primary-foreground">
            <div className="pointer-events-none absolute inset-0 bg-gradient-ai-glow opacity-60" aria-hidden />
            <div className="relative flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-pill bg-primary-foreground/15 backdrop-blur-sm">
                <MailMindLogo className="size-8 text-primary-foreground" />
              </span>
              <div>
                <p className="text-meta font-semibold uppercase tracking-[0.12em] text-primary-foreground/85">
                  MailMind
                </p>
                <h1 className="font-serif text-3xl leading-tight tracking-[-0.02em]">welcome back</h1>
              </div>
            </div>
            <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-primary-foreground/90">
              sign in to connect Gmail. tokens stay on the server.
            </p>
          </div>

          <div className="space-y-5 p-7">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/inbox" });
              }}
            >
              <Button type="submit" className="w-full rounded-pill shadow-md" size="lg">
                continue with Google
              </Button>
            </form>

            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                what we ask Google for
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>read &amp; modify Gmail (labels, archive, trash).</li>
                <li>send mail when you tap send.</li>
                <li>your name + email for display.</li>
              </ul>
              <p className="mt-3 font-mono text-[12px] leading-snug">
                revoke anytime from{" "}
                <a
                  className="underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google permissions
                </a>
                .
              </p>
            </div>

            <p className="text-center font-mono text-[12px] text-muted-foreground">
              Microsoft 365 + IMAP are extension-ready — see <code className="text-foreground/80">specs/002-auth-providers.md</code>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
