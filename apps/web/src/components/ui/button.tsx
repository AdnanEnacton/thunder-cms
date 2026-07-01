import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-thunder-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-thunder-600 text-white shadow-sm hover:bg-thunder-700 hover:shadow-md",
        secondary:
          "bg-surface-raised text-foreground border border-border shadow-xs hover:bg-surface-overlay hover:border-border",
        ghost: "text-muted hover:bg-surface-overlay hover:text-foreground",
        outline:
          "border border-border bg-transparent hover:bg-surface-overlay hover:border-thunder-300",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-lg",
        lg: "h-12 px-7 text-base rounded-xl",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}