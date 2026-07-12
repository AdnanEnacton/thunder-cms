"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Code2, Copy, GitCommit, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RendererDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

interface Renderer {
  target: string;
  path: string;
  code: string;
  language: string;
}

export function RendererDialog({ open, projectId, onClose }: RendererDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [copied, setCopied] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setCommitted("");
      setRenderer(null);
      const res = await fetch(`/api/projects/${projectId}/blocks/renderer`);
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Failed to generate renderer");
        return;
      }
      setRenderer(data);
    }
    load();
    return () => {
      active = false;
    };
  }, [open, projectId]);

  if (!open) return null;

  async function copy() {
    if (!renderer) return;
    try {
      await navigator.clipboard.writeText(renderer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard unavailable — select and copy manually.");
    }
  }

  async function commit() {
    if (!renderer) return;
    setCommitting(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/blocks/renderer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: renderer.path }),
    });
    const data = await res.json().catch(() => ({}));
    setCommitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to commit renderer");
      return;
    }
    setCommitted(data.path ?? renderer.path);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-thunder-600" />
            <h3 className="text-base font-semibold">Blocks renderer</h3>
            {renderer && (
              <span className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {renderer.path}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-2.5">
          <p className="text-xs text-muted">
            Drop this component into your {renderer?.target === "astro" ? "Astro" : "React"} project
            and render a page&apos;s <code className="font-mono">blocks</code> with it. It maps each
            block&apos;s <code className="font-mono">_template</code> to your component.
          </p>
        </div>

        <div className="flex-1 overflow-auto bg-surface-subtle p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating…
            </div>
          ) : error && !renderer ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : renderer ? (
            <pre className="overflow-auto rounded-xl border border-border bg-surface-raised p-4 text-xs leading-relaxed">
              <code className="font-mono text-foreground">{renderer.code}</code>
            </pre>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <div className="min-w-0 text-xs">
            {committed ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Committed to {committed}
              </span>
            ) : error && renderer ? (
              <span className="text-destructive">{error}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copy} disabled={!renderer}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" onClick={commit} disabled={!renderer || committing}>
              <GitCommit className="h-3.5 w-3.5" />
              {committing ? "Committing…" : "Commit to repo"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
