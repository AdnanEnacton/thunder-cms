"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GitCommit, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommitMessageDialogProps {
  open: boolean;
  defaultTitle: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
}

export function CommitMessageDialog({
  open,
  defaultTitle,
  saving,
  onClose,
  onConfirm,
}: CommitMessageDialogProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMessage(`Update: "${defaultTitle}"`);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultTitle]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-thunder-600" />
            <h3 className="text-base font-semibold">Commit message</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">This will be the Git commit message for your save.</p>

        <input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && message.trim() && !saving) onConfirm(message.trim());
          }}
          placeholder="Update: my post"
          className="mt-4 w-full rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm outline-none focus:border-thunder-400"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(message.trim())} disabled={!message.trim() || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCommit className="h-3.5 w-3.5" />}
            Save & commit
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
