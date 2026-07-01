import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title: string;
  description?: string;
  variant?: "fullscreen" | "inline" | "panel";
  className?: string;
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div className={cn("relative", sizeClass)} role="status" aria-label="Loading">
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-thunder-100",
          sizeClass,
        )}
      />
      <div
        className={cn(
          "absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-thunder-600",
          sizeClass,
        )}
      />
    </div>
  );
}

export function LoadingState({
  title,
  description,
  variant = "inline",
  className,
}: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 scale-150 rounded-full bg-thunder-500/5 blur-xl" />
        <LoadingSpinner size={variant === "fullscreen" ? "lg" : "md"} />
      </div>
      <p
        className={cn(
          "font-medium tracking-tight text-foreground",
          variant === "fullscreen" ? "text-base" : "text-sm",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      )}
      <LoadingDots className="mt-4" />
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div
        className={cn(
          "flex h-screen w-full items-center justify-center bg-surface",
          className,
        )}
      >
        <div className="surface-card w-full max-w-sm px-8 py-10 shadow-md">{content}</div>
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div className={cn("flex flex-1 items-center justify-center px-6 py-20", className)}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center px-6 py-16", className)}>
      {content}
    </div>
  );
}

function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-thunder-400"
          style={{
            animation: "loading-dot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

export function EntryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="p-4">
      <div className="mb-3 h-10 animate-pulse rounded-xl bg-surface-overlay" />
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-raised px-4 py-3.5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-surface-overlay" />
              <div className="space-y-2">
                <div
                  className="h-3.5 animate-pulse rounded-md bg-surface-overlay"
                  style={{ width: `${60 + (i % 3) * 15}%`, minWidth: "140px", maxWidth: "280px" }}
                />
                <div className="h-2.5 w-32 animate-pulse rounded-md bg-surface-overlay/80" />
              </div>
            </div>
            <div className="h-3 w-16 animate-pulse rounded-md bg-surface-overlay/80" />
          </div>
        ))}
      </div>
    </div>
  );
}