import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-soft hover:brightness-105 hover:shadow-xs",
        soft: "bg-primary-soft text-primary-strong hover:bg-primary-soft/80",
        outline: "border border-border bg-card text-foreground hover:bg-muted/70 shadow-2xs",
        ghost: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        sun: "bg-sun text-white shadow-soft hover:brightness-105",
        danger: "bg-coral-soft text-coral-strong hover:bg-coral-soft/80",
        ai: "bg-gradient-to-r from-primary via-lilac to-sky text-white shadow-soft hover:brightness-105 hover:shadow-md",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export { buttonVariants };
