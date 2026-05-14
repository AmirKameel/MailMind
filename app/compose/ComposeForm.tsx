"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendMessageAction } from "./actions";

type AccountOpt = { id: string; emailAddr: string; provider: string };

type ComposeDraft = {
  accountId: string;
  subject: string;
  bodyText: string;
};

export function ComposeForm({
  accounts,
  composeDraft,
}: {
  accounts: AccountOpt[];
  composeDraft?: ComposeDraft;
}) {
  const [status, setStatus] = useState<null | "sending" | "sent" | "error">(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-lg border border-border/60 bg-card/90 p-5 shadow-sm md:p-6"
      action={(formData) => {
        setStatus("sending");
        setError(null);
        startTransition(async () => {
          const res = await sendMessageAction(formData);
          if (res.ok) {
            setStatus("sent");
          } else {
            setStatus("error");
            setError(res.error);
          }
        });
      }}
    >
      <label className="block text-sm">
        <span className="text-meta text-muted-foreground">from</span>
        <select
          name="accountId"
          required
          defaultValue={composeDraft?.accountId ?? accounts[0]?.id}
          className="mt-1.5 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          {accounts.length === 0 ? (
            <option value="">no accounts connected</option>
          ) : (
            accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emailAddr} ({a.provider})
              </option>
            ))
          )}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-meta text-muted-foreground">to</span>
        <input
          name="to"
          type="email"
          required
          placeholder="recipient@example.com"
          className="mt-1.5 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
        />
      </label>

      <label className="block text-sm">
        <span className="text-meta text-muted-foreground">subject</span>
        <input
          name="subject"
          required
          defaultValue={composeDraft?.subject ?? ""}
          className="mt-1.5 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
        />
      </label>

      <label className="block text-sm">
        <span className="text-meta text-muted-foreground">message</span>
        <textarea
          name="body"
          required
          rows={10}
          defaultValue={composeDraft?.bodyText ?? ""}
          className="mt-1.5 min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground shadow-inner outline-none transition-[border-color,box-shadow] duration-hover ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || accounts.length === 0} className="rounded-pill shadow-md">
          {isPending ? "sending…" : "send"}
        </Button>
        {status === "sent" && (
          <span className="text-sm text-[var(--success)]">sent. nicely done.</span>
        )}
        {status === "error" && (
          <span className="text-sm text-destructive">{error}</span>
        )}
      </div>
    </form>
  );
}
