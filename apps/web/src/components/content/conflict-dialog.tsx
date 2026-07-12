"use client";

import { useEffect } from "react";
import { GitMerge, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConflictDialogProps {
  open: boolean;
  busy?: boolean;
  /** Discard local edits and load the newest version from the repo. */
  onReload: () => void;
  /** Force-save local edits over the newer version. */
  onOverwrite: () => void;
  /** Dismiss and keep editing (do nothing). */
  onCancel: () => void;
}

export function ConflictDialog({
  open,
  busy = false,
  onReload,
  onOverwrite,
  onCancel,
}: ConflictDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-label="Close dialog"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-xl"
      >
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="conflict-dialog-title" className="text-base font-semibold tracking-tight text-foreground">
              This entry changed while you were editing
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Someone else committed a newer version of this file. Choose how to proceed —
              overwriting will replace their changes with yours.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="secondary" onClick={onReload} disabled={busy} className="justify-start">
            <RefreshCw className="h-4 w-4" />
            Reload latest — discard my changes
          </Button>
          <Button variant="destructive" onClick={onOverwrite} disabled={busy} className="justify-start">
            <GitMerge className="h-4 w-4" />
            {busy ? "Overwriting…" : "Overwrite — save my version"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={busy} className="justify-start">
            Keep editing
          </Button>
        </div>
      </div>
    </div>
  );
}
