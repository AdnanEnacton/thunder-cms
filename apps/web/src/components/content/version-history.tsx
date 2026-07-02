"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { History, Loader2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface VersionHistoryProps {
  open: boolean;
  projectId: string;
  filePath: string;
  onClose: () => void;
  onRestored: () => void;
}

export function VersionHistory({ open, projectId, filePath, onClose, onRestored }: VersionHistoryProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !filePath) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/projects/${projectId}/content/entry/history?path=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!cancelled) {
          if (!res.ok) setError(data.error ?? "Failed to load history");
          else setCommits(data.commits ?? []);
        }
      })
      .catch(() => !cancelled && setError("Failed to load history"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, projectId, filePath]);

  if (!open) return null;

  async function restore(sha: string) {
    setRestoring(sha);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/content/entry/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, commitSha: sha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to restore");
      } else {
        onRestored();
        onClose();
      }
    } catch {
      setError("Failed to restore");
    } finally {
      setRestoring(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-thunder-600" />
            <div>
              <h2 className="text-base font-semibold">Version history</h2>
              <p className="truncate text-xs text-muted">{filePath}</p>
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

        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="flex justify-center py-10 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
          ) : commits.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted">No commit history found.</p>
          ) : (
            <div className="space-y-1">
              {commits.map((c, i) => (
                <div
                  key={c.sha}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                    i === 0 ? "border-thunder-200 bg-thunder-50/50 dark:border-thunder-500/30 dark:bg-thunder-500/10" : "border-border bg-surface-subtle",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.message.split("\n")[0]}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.author} · {new Date(c.date).toLocaleString()} · <code className="font-mono">{c.sha.slice(0, 7)}</code>
                    </p>
                  </div>
                  {i !== 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-muted hover:text-thunder-600"
                      disabled={restoring === c.sha}
                      onClick={() => restore(c.sha)}
                      title="Restore this version"
                    >
                      {restoring === c.sha ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Restore
                    </Button>
                  )}
                  {i === 0 && (
                    <span className="shrink-0 badge badge-primary">Current</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
