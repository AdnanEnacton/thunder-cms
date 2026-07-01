import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "default" }: { className?: string; size?: "default" | "lg" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-[10px] bg-gradient-to-br from-thunder-500 to-thunder-700 shadow-sm",
          size === "lg" ? "h-10 w-10" : "h-8 w-8",
        )}
      >
        <Zap
          className={cn("text-white", size === "lg" ? "h-5 w-5" : "h-4 w-4")}
          fill="currentColor"
        />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            size === "lg" ? "text-lg" : "text-sm",
          )}
        >
          THUNDER
        </span>
        {size === "lg" && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted">
            CMS
          </span>
        )}
        {size === "default" && (
          <span className="-mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
            CMS
          </span>
        )}
      </div>
    </div>
  );
}