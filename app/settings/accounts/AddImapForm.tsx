"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { addImapAccount } from "./actions";

export function AddImapForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {!open ? (
        <Button className="mt-4 w-full" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add IMAP account
        </Button>
      ) : (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const res = await addImapAccount(formData);
              if (!res.ok) setError(res.error);
              else {
                setOpen(false);
                // trigger a server-side re-render via location reload (simplest)
                window.location.reload();
              }
            });
          }}
          className="mt-4 space-y-2"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@yahoo.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="App-specific password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Advanced</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                name="imapHost"
                placeholder="imap host (auto)"
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              />
              <input
                name="imapPort"
                type="number"
                placeholder="993"
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              />
              <input
                name="smtpHost"
                placeholder="smtp host (auto)"
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              />
              <input
                name="smtpPort"
                type="number"
                placeholder="465"
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              />
            </div>
          </details>
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Connecting…" : "Connect"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
