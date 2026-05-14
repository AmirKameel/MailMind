import type { MessageDetail } from "@/lib/types";

/** Plain-text body for a forward compose window. */
export function buildForwardBody(message: MessageDetail): string {
  const from = message.from.name
    ? `${message.from.name} <${message.from.email}>`
    : message.from.email;
  const lines = [
    "",
    "---------- Forwarded message ----------",
    `From: ${from}`,
    `Date: ${new Date(message.date).toLocaleString()}`,
    `Subject: ${message.subject}`,
    "",
    message.bodyText.slice(0, 50_000),
  ];
  return lines.join("\n");
}
