import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Terms for using the MailMind application.",
};

export default function TermsPage() {
  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <p className="text-meta font-semibold uppercase tracking-[0.12em] text-muted-foreground">MailMind</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-foreground md:text-4xl">Terms of service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: May 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Agreement</h2>
          <p>
            By accessing or using MailMind, you agree to these terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">The service</h2>
          <p>
            MailMind is provided &quot;as is&quot; and &quot;as available.&quot; Features may change, be limited, or
            require configuration (such as API keys) depending on how the app is deployed.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Your responsibilities</h2>
          <p>
            You are responsible for your accounts, credentials, and compliance with your email provider&apos;s terms.
            Do not use the product in violation of applicable law or third-party agreements.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, the operators and contributors of MailMind are not liable for
            indirect or consequential damages, loss of data, or service interruptions.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="font-semibold text-foreground">Privacy</h2>
          <p>
            Our privacy practices are described in the{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-4 hover:no-underline">
              privacy policy
            </Link>
            .
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
