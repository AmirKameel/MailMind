import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        urgent: "border-transparent bg-red-500/15 text-red-600 dark:text-red-400",
        important: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
        normal: "border-transparent bg-slate-500/15 text-slate-600 dark:text-slate-300",
        low: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        ai: "border-transparent bg-[color-mix(in_oklch,var(--ai)_18%,transparent)] text-ai-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
