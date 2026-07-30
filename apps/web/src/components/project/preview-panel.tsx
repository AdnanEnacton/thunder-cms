"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Monitor, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewPanelProps {
  projectId: string;
}

/**
 * Live preview of the deployed site. Renders the configured `previewUrl`
 * (staging or production URL) in an iframe so editors can see the site
 * alongside their content without leaving the CMS.
 */
export function PreviewPanel({ projectId }: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Bump to force the iframe to remount and reload.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPreviewUrl(data.project?.previewUrl ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface p-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
          <Monitor className="h-7 w-7 text-muted" />
        </div>
        <div>
          <p className="font-medium">No preview URL configured</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add your deployed site URL (staging or production) to preview it here as you edit.
          </p>
        </div>
        <Link
          href={`/dashboard/projects/${projectId}/settings`}
          className="text-sm font-medium text-thunder-600 hover:text-thunder-700 hover:underline"
        >
          Add a preview URL in settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-raised px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Monitor className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-muted">{previewUrl}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-muted hover:text-foreground"
            title="Reload preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </Button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
            title="Open in a new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </div>
      </div>

      <iframe
        key={reloadKey}
        src={previewUrl}
        title="Site preview"
        className="min-h-0 flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
