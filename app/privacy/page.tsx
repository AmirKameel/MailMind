import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How MailMind handles your data, OAuth tokens, and third-party services.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <p className="text-meta font-semibold uppercase tracking-[0.12em] text-muted-foreground">MailMind</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-foreground md:text-4xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: May 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Overview</h2>
          <p>
            MailMind is an email client. This policy describes what we process when you use the service, including
            sign-in with Google and optional AI features.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Account and authentication</h2>
          <p>
            When you connect Google (or other providers where supported), OAuth tokens are stored on the server only.
            They are not exposed to the browser beyond your signed-in session. You can disconnect accounts from in-app
            settings where available.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Email content</h2>
          <p>
            Message metadata and content are retrieved to display your inbox and messages. Processing happens on our
            infrastructure for the purpose of providing the product.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Optional AI features</h2>
          <p>
            Summaries, drafts, and prioritization may call an AI provider when enabled and configured by the deployment
            operator. Those requests should not include long-term storage of your messages beyond what is needed for
            caching and product operation; review your deployment&apos;s configuration and provider terms.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Cookies and sessions</h2>
          <p>
            We use cookies or similar technologies for authentication and security (for example session cookies). See
            your browser settings to manage cookies.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Contact</h2>
          <p>
            For privacy questions about this deployment, contact the operator of the site (for example the address
            shown in the OAuth consent screen or project README).
          </p>
        </section>
      </div>

      <p className="mt-12 text-center text-sm">
        <Link href="/" className="text-primary underline underline-offset-4 hover:no-underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
