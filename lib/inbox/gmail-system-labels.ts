/** Gmail system label ids — stable across accounts (MVP multi-account filter). */
export const GMAIL_SYSTEM_LABEL_OPTIONS: { id: string; name: string }[] = [
  { id: "INBOX", name: "Inbox" },
  { id: "STARRED", name: "Starred" },
  { id: "IMPORTANT", name: "Important" },
  { id: "SENT", name: "Sent" },
  { id: "DRAFT", name: "Drafts" },
  { id: "SPAM", name: "Spam" },
  { id: "TRASH", name: "Trash" },
];
