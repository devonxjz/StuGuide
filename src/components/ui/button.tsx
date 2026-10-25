import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-primary to-blue-600 text-white shadow-colorful hover:brightness-105 hover:shadow-md hover:-translate-y-0.5",
        soft: "bg-blue-50/90 text-primary-strong border border-blue-200/70 hover:bg-blue-100 shadow-2xs",
        outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs hover:border-slate-300",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        sun: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-soft hover:brightness-105 hover:shadow-md hover:-translate-y-0.5",
        danger: "bg-rose-50 text-rose-700 border border-rose-200/70 hover:bg-rose-100",
        ai: "bg-gradient-to-r from-primary via-purple-600 to-pink-500 text-white shadow-colorful hover:brightness-105 hover:shadow-lg hover:-translate-y-0.5",
      },
      size: {
        sm: "h-8.5 px-3.5 text-xs",
        md: "h-10.5 px-4.5",
        lg: "h-12 px-6 text-base",
        icon: "size-9.5 rounded-xl",
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
