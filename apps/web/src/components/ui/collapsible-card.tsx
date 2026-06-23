"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  size?: "default" | "compact";
}

export function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  size = "default",
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-3 text-left transition-colors hover:bg-surface-overlay/60",
          size === "compact" ? "px-3 py-2.5" : "px-4 py-3.5",
        )}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("font-medium text-foreground", size === "compact" && "text-sm")}>
              {title}
            </p>
            {badge && (
              <span className="rounded-full bg-thunder-50 px-2 py-0.5 text-xs font-medium text-thunder-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
      </button>

      {open && (
        <div
          className={cn(
            "border-t border-border bg-surface",
            size === "compact" ? "px-3 py-3" : "px-4 py-4",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}