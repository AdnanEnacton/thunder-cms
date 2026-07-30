"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { analyzeSeo, type SeoStatus } from "@/lib/seo/analyze";
import { cn } from "@/lib/utils";

interface SeoPanelProps {
  open: boolean;
  frontmatter: Record<string, unknown>;
  body: string;
  filePath?: string;
  onClose: () => void;
}

const STATUS_ICON: Record<SeoStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
};

const STATUS_COLOR: Record<SeoStatus, string> = {
  good: "text-emerald-500",
  warn: "text-amber-500",
  bad: "text-red-500",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs work";
  return "Poor";
}

export function SeoPanel({ open, frontmatter, body, filePath, onClose }: SeoPanelProps) {
  // Recompute only when inputs change; the modal stays mounted-free otherwise.
  const report = useMemo(
    () => analyzeSeo(frontmatter, body, filePath),
    [frontmatter, body, filePath],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-thunder-50 text-thunder-600 dark:bg-thunder-500/15 dark:text-thunder-300">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">SEO suggestions</h2>
              <p className="text-xs text-muted">Live analysis of this entry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 border-b border-border bg-surface-subtle px-5 py-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4 border-border">
            <span className={cn("text-xl font-bold leading-none", scoreColor(report.score))}>
              {report.score}
            </span>
            <span className="text-[9px] text-muted">/ 100</span>
          </div>
          <div>
            <p className={cn("text-sm font-semibold", scoreColor(report.score))}>
              {scoreLabel(report.score)}
            </p>
            <p className="text-xs text-muted">
              {report.checks.filter((c) => c.status === "good").length} of {report.checks.length}{" "}
              checks passing. Fix the flagged items below to improve your score.
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-auto px-5 py-4">
          {report.checks.map((check) => {
            const Icon = STATUS_ICON[check.status];
            return (
              <div
                key={check.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2.5"
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", STATUS_COLOR[check.status])} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted">{check.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
