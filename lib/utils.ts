import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(nameOrEmail: string): string {
  const v = nameOrEmail.split("@")[0];
  const parts = v.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function colorForAccount(accountId: string): string {
  const palette = [
    "bg-[color-mix(in_oklch,var(--primary)_18%,var(--muted))] text-primary",
    "bg-[color-mix(in_oklch,var(--ai)_16%,var(--muted))] text-ai-foreground",
    "bg-[color-mix(in_oklch,var(--accent)_35%,var(--muted))] text-accent-foreground",
    "bg-[color-mix(in_oklch,var(--success)_22%,var(--muted))] text-[oklch(0.32_0.08_160)]",
    "bg-[color-mix(in_oklch,var(--warning)_25%,var(--muted))] text-[oklch(0.35_0.08_70)]",
    "bg-muted text-foreground",
  ];
  let h = 0;
  for (let i = 0; i < accountId.length; i++) h = (h * 31 + accountId.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
