"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addMessageLabelAction, removeMessageLabelAction } from "@/app/inbox/[id]/actions";
import type { Label } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  accountId: string;
  messageId: string;
  /** Gmail label ids currently on the message */
  activeLabelIds: string[];
  /** All labels for this mailbox (from provider.listLabels) */
  allLabels: Label[];
}

export function MessageLabels({ accountId, messageId, activeLabelIds, allLabels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedToAdd, setSelectedToAdd] = useState("");

  const nameById = new Map(allLabels.map((l) => [l.id, l.name]));
  const activeSet = new Set(activeLabelIds);
  const addable = allLabels.filter((l) => !activeSet.has(l.id));

  function refresh() {
    router.refresh();
  }

  function removeLabel(labelId: string) {
    setError(null);
    const fd = new FormData();
    fd.set("accountId", accountId);
    fd.set("messageId", messageId);
    fd.set("labelId", labelId);
    startTransition(async () => {
      const res = await removeMessageLabelAction(fd);
      if (!res.ok) setError(res.error);
      else refresh();
    });
  }

  function addLabel() {
    if (!selectedToAdd) return;
    setError(null);
    const fd = new FormData();
    fd.set("accountId", accountId);
    fd.set("messageId", messageId);
    fd.set("labelId", selectedToAdd);
    startTransition(async () => {
      const res = await addMessageLabelAction(fd);
      if (!res.ok) setError(res.error);
      else {
        setSelectedToAdd("");
        refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-sm font-medium text-foreground">Labels</div>
      <p className="mt-1 text-xs text-muted-foreground">Remove a label with ×. Add from the list (Gmail uses label ids).</p>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {activeLabelIds.map((id) => (
          <Badge key={id} variant="secondary" className="gap-1 pr-1">
            <span>{nameById.get(id) ?? id}</span>
            <button
              type="button"
              className="rounded p-0.5 hover:bg-background/80"
              aria-label={`Remove label ${nameById.get(id) ?? id}`}
              disabled={pending}
              onClick={() => removeLabel(id)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {activeLabelIds.length === 0 && (
          <span className="text-xs text-muted-foreground">No labels on this message.</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Add label</span>
          <select
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            disabled={pending || addable.length === 0}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            <option value="">Choose…</option>
            {addable.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.kind})
              </option>
            ))}
          </select>
        </label>
        <Button type="button" size="sm" disabled={pending || !selectedToAdd} onClick={addLabel}>
          Add
        </Button>
      </div>
    </div>
  );
}
