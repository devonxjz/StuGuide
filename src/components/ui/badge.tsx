import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold [&_svg]:size-3.5 shadow-2xs select-none transition-transform hover:scale-[1.03]",
  {
    variants: {
      tone: {
        neutral: "bg-slate-100 text-slate-700 border border-slate-200",
        success: "bg-emerald-50 text-emerald-800 border border-emerald-200/90",
        warning: "bg-amber-50 text-amber-800 border border-amber-200/90",
        danger: "bg-rose-50 text-rose-800 border border-rose-200/90",
        info: "bg-sky-50 text-sky-800 border border-sky-200/90",
        ai: "bg-purple-50 text-purple-800 border border-purple-200/90",
        primary: "bg-blue-50 text-blue-800 border border-blue-200/90",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
