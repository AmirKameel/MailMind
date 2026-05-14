import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Archive, Forward, Trash2 } from "lucide-react";
import { archiveMessageAction, trashMessageAction } from "@/app/inbox/[id]/actions";

interface Props {
  accountId: string;
  messageId: string;
}

export function MessageToolbar({ accountId, messageId }: Props) {
  const composeForwardHref = `/compose?forwardAccountId=${encodeURIComponent(accountId)}&forwardMessageId=${encodeURIComponent(messageId)}`;

  return (
    <div className="flex gap-1">
      <form action={archiveMessageAction}>
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="messageId" value={messageId} />
        <Button type="submit" variant="ghost" size="icon" aria-label="Archive" title="Archive">
          <Archive className="size-4" />
        </Button>
      </form>
      <form action={trashMessageAction}>
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="messageId" value={messageId} />
        <Button type="submit" variant="ghost" size="icon" aria-label="Move to trash" title="Move to trash">
          <Trash2 className="size-4" />
        </Button>
      </form>
      <Button variant="ghost" size="icon" aria-label="Forward" title="Forward" asChild>
        <Link href={composeForwardHref}>
          <Forward className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
