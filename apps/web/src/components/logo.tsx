import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-thunder-600">
        <Zap className="h-4 w-4 text-white" fill="currentColor" />
      </div>
      <span className="text-sm font-bold tracking-wide">THUNDER-CMS</span>
    </div>
  );
}