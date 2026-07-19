import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-thunder-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-thunder-500/20",
        className,
      )}
      {...props}
    />
  );
}