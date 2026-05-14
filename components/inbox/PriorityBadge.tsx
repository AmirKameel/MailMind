import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type InboxPriority = "urgent" | "important" | "normal" | "low";

interface Props {
  priority: InboxPriority | "pending";
  reason?: string;
}

export function PriorityBadge({ priority, reason }: Props) {
  if (priority === "pending") {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1 font-normal" title="Priority loading…">
        <Sparkles className="size-3 text-ai" aria-hidden />
        …
      </Badge>
    );
  }

  const variant =
    priority === "urgent"
      ? "urgent"
      : priority === "important"
        ? "important"
        : priority === "low"
          ? "low"
          : "normal";

  return (
    <Badge variant={variant} className="shrink-0 gap-1 capitalize" title={reason || undefined}>
      <Sparkles className="size-3 text-ai" aria-hidden />
      {priority}
    </Badge>
  );
}
