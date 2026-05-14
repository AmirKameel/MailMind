import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/** Brand mark: rounded envelope + smile + AI spark (see MailMind-Brand-Guidelines). */
export function MailMindLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect x="3" y="8" width="22" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11 Q14 18 23 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path
        d="M11 17 Q14 19.5 17 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
      <circle cx="27" cy="6" r="2.6" fill="var(--ai)" />
    </svg>
  );
}
