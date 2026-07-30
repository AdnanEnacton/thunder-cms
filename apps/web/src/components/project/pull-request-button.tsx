"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, ExternalLink, Loader2 } from "lucide-react";

interface PrStatus {
  needsPr: boolean;
  base: string;
  head: string;
  existing: { number: number; url: string } | null;
  aheadBy: number;
}

interface PullRequestButtonProps {
  projectId: string;
}

/**
 * Sidebar action for the review workflow. Only renders when the project's
 * target branch differs from its default branch (staging → main). Opens a PR
 * via the API, or links to an already-open one.
 */
export function PullRequestButton({ projectId }: PullRequestButtonProps) {
  const [status, setStatus] = useState<PrStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/pull-request`);
        if (!res.ok) return;
        const data = (await res.json()) as PrStatus;
        if (!cancelled) setStatus(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function openPr() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/pull-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to open pull request");
        return;
      }
      setStatus((prev) =>
        prev
          ? { ...prev, existing: { number: data.pullRequest.number, url: data.pullRequest.url } }
          : prev,
      );
      window.open(data.pullRequest.url, "_blank", "noopener");
    } catch {
      setError("Failed to open pull request");
    } finally {
      setCreating(false);
    }
  }

  // Nothing to review when working directly on the default branch.
  if (loading || !status || !status.needsPr) return null;

  if (status.existing) {
    return (
      <a
        href={status.existing.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-thunder-300/60 bg-thunder-50 px-2.5 py-1.5 text-[11px] font-medium text-thunder-700 transition-all hover:bg-thunder-100 dark:bg-thunder-500/10 dark:text-thunder-300"
        title={`Pull request #${status.existing.number} (${status.head} → ${status.base})`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <GitPullRequest className="h-3 w-3 shrink-0" />
          <span className="truncate">PR #{status.existing.number} open</span>
        </div>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={openPr}
        disabled={creating || status.aheadBy === 0}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-left text-[11px] font-medium transition-all hover:border-thunder-300/50 hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-60"
        title={
          status.aheadBy === 0
            ? `No commits on ${status.head} to merge into ${status.base}`
            : `Open pull request: ${status.head} → ${status.base}`
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          {creating ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted" />
          ) : (
            <GitPullRequest className="h-3 w-3 shrink-0 text-muted" />
          )}
          <span className="truncate text-foreground">
            {status.aheadBy === 0 ? "Nothing to publish" : "Open pull request"}
          </span>
        </div>
        {status.aheadBy > 0 && (
          <span className="badge badge-warning shrink-0">{status.aheadBy}</span>
        )}
      </button>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
