"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchInfo {
  name: string;
  isDefault: boolean;
  isTarget: boolean;
}

interface BranchSelectorProps {
  projectId: string;
}

export function BranchSelector({ projectId }: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [target, setTarget] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/branches`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setBranches(data.branches ?? []);
        setTarget(data.targetBranch ?? "");
        setDefaultBranch(data.defaultBranch ?? "main");
        setCanManage(data.canManage ?? false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function switchBranch(name: string) {
    setSwitching(true);
    setError("");
    setOpen(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/branches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to switch branch");
        setSwitching(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Failed to switch branch");
      setSwitching(false);
    }
  }

  async function createBranch() {
    const name = newBranch.trim();
    if (!name) return;
    setSwitching(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/branches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: name, createIfMissing: name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create branch");
        setSwitching(false);
        return;
      }
      setNewBranch("");
      window.location.reload();
    } catch {
      setError("Failed to create branch");
      setSwitching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading branch…
      </div>
    );
  }

  return (
    <div className="border-b border-border px-3 pb-3">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => canManage && setOpen(!open)}
          disabled={!canManage}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-left text-xs font-medium transition-all",
            canManage && "hover:border-thunder-300/50 hover:bg-surface-overlay",
            !canManage && "cursor-default opacity-90",
          )}
          title={canManage ? "Switch target branch" : "Only owners can switch branches"}
        >
          <div className="flex min-w-0 items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="truncate font-semibold text-foreground">{target || defaultBranch}</span>
            {target && target !== defaultBranch && (
              <span className="badge badge-warning shrink-0">staging</span>
            )}
          </div>
        </button>

        {open && canManage && (
          <div className="dropdown-menu absolute left-0 right-0 z-50 mt-1.5 max-h-72 overflow-y-auto">
            <div className="dropdown-label">Switch branch</div>
            <div className="space-y-0.5">
              {branches.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => switchBranch(b.name)}
                  className="dropdown-item"
                >
                  <GitBranch className="h-3.5 w-3.5 text-muted" />
                  <span className="truncate">{b.name}</span>
                  {b.isDefault && <span className="ml-auto text-[10px] text-muted">default</span>}
                  {b.name === target && <Check className="h-3 w-3 text-thunder-600" />}
                </button>
              ))}
            </div>
            <div className="my-1 border-t border-border" />
            <div className="flex items-center gap-1.5 px-1 py-1">
              <input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="new-branch-name"
                className="min-w-0 flex-1 rounded-md border border-border bg-surface-subtle px-2 py-1 text-xs outline-none focus:border-thunder-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBranch.trim()) createBranch();
                }}
              />
              <button
                type="button"
                onClick={createBranch}
                disabled={!newBranch.trim() || switching}
                className="flex shrink-0 items-center gap-1 rounded-md bg-thunder-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
