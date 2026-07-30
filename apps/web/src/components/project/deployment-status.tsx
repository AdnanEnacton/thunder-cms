"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DeploymentState = "success" | "pending" | "failure" | "error" | "none";

interface Deployment {
  state: DeploymentState;
  description: string | null;
  logUrl: string | null;
  environmentUrl: string | null;
  environment: string | null;
  updatedAt: string | null;
}

interface DeploymentStatusProps {
  projectId: string;
}

const META: Record<DeploymentState, { label: string; dot: string; text: string }> = {
  success: { label: "Deployed", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  pending: { label: "Building…", dot: "bg-amber-500 animate-pulse", text: "text-amber-600 dark:text-amber-400" },
  failure: { label: "Deploy failed", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  error: { label: "Deploy error", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  none: { label: "No deploys", dot: "bg-muted", text: "text-muted" },
};

export function DeploymentStatus({ projectId }: DeploymentStatusProps) {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/deployment`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDeployment(data.deployment ?? null);
        // While a build is in flight, poll so the status flips to Deployed on its own.
        if (data.deployment?.state === "pending") {
          timerRef.current = setTimeout(load, 15000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-0.5 py-1 text-[11px] text-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        Deploy status…
      </div>
    );
  }

  // Nothing configured / no deploys wired up yet — stay quiet to avoid clutter.
  if (!deployment || deployment.state === "none") return null;

  const meta = META[deployment.state];
  const href = deployment.environmentUrl || deployment.logUrl;

  const inner = (
    <>
      <span className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
        <span className={cn("truncate font-medium", meta.text)}>{meta.label}</span>
      </span>
      {href && <ExternalLink className="h-3 w-3 shrink-0 text-muted" />}
    </>
  );

  const title = deployment.description || deployment.environment || meta.label;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-[11px] transition-all hover:border-thunder-300/50 hover:bg-surface-overlay"
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      title={title}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-[11px]"
    >
      {inner}
    </div>
  );
}
