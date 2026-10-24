import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3 shadow-2xs", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground border border-border/70",
      success: "bg-mint-soft text-mint-strong border border-mint/25",
      warning: "bg-sun-soft text-sun-strong border border-sun/25",
      danger: "bg-coral-soft text-coral-strong border border-coral/25",
      info: "bg-sky-soft text-sky-strong border border-sky/25",
      ai: "bg-lilac-soft text-lilac-strong border border-lilac/25",
      primary: "bg-primary-soft text-primary-strong border border-primary/25",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
