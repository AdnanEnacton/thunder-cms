import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = "default",
  light = false,
}: {
  className?: string;
  size?: "default" | "lg";
  light?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-gradient-to-br from-thunder-500 to-thunder-700 shadow-xs",
          size === "lg" ? "h-9 w-9" : "h-7 w-7",
        )}
      >
        <Zap
          className={cn("text-white", size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")}
          fill="currentColor"
        />
      </div>
      <span
        className={cn(
          "font-semibold tracking-tight",
          size === "lg" ? "text-lg" : "text-[15px]",
          light ? "text-white" : "text-foreground",
        )}
      >
        THUNDER
        <span
          className={cn(
            "ml-1 font-medium",
            light ? "text-white/55" : "text-muted",
          )}
        >
          CMS
        </span>
      </span>
    </div>
  );
}
