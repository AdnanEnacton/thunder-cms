"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Blocks,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { BlockDef } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BlockPickerDialogProps {
  open: boolean;
  blocks: BlockDef[];
  loading?: boolean;
  source?: "config" | "folder-scan" | null;
  warnings?: string[];
  onAdd: (def: BlockDef) => void;
  onEdit: (def: BlockDef) => void;
  onDelete: (def: BlockDef) => void;
  onNew: () => void;
  onRefresh?: () => void;
  onClose: () => void;
}

function groupByCategory(blocks: BlockDef[]): [string, BlockDef[]][] {
  const groups = new Map<string, BlockDef[]>();
  for (const block of blocks) {
    const cat = block.category?.trim() || "Blocks";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(block);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export function BlockPickerDialog({
  open,
  blocks,
  loading,
  source,
  warnings,
  onAdd,
  onEdit,
  onDelete,
  onNew,
  onRefresh,
  onClose,
}: BlockPickerDialogProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter(
      (b) => b.label.toLowerCase().includes(q) || b.key.toLowerCase().includes(q),
    );
  }, [blocks, query]);

  const groups = groupByCategory(filtered);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-picker-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Blocks className="h-4 w-4 text-thunder-600" />
            <h3 id="block-picker-title" className="text-base font-semibold">
              Add a block
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className={cn(
                  "rounded-md p-1.5 text-muted transition-colors hover:bg-surface-overlay hover:text-thunder-600",
                  loading && "animate-spin",
                )}
                title="Re-read components from your repo"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-overlay"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blocks…"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {source === "config" && (
          <div className="flex items-center gap-1.5 border-b border-border bg-thunder-50 px-5 py-1.5 text-[11px] font-medium text-thunder-700 dark:bg-thunder-500/10 dark:text-thunder-400">
            <Package className="h-3 w-3 shrink-0" />
            thunder.config.ts
          </div>
        )}

        {source === "folder-scan" && (
          <div className="flex items-center gap-1.5 border-b border-border bg-surface-subtle px-5 py-1.5 text-[11px] text-muted">
            <Package className="h-3 w-3 shrink-0" />
            Folder scan (legacy) — set up thunder.config.ts in Settings
          </div>
        )}

        {!!warnings?.length && (
          <div className="space-y-1 border-b border-border bg-amber-50 px-5 py-2 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <p className="px-2 py-2 text-xs text-muted">Loading blocks…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-overlay">
                <Blocks className="h-5 w-5 text-muted" />
              </div>
              <p className="text-xs text-muted">
                {blocks.length === 0
                  ? "No components found in your components folder yet. Add components there, or create a manual block type."
                  : "No blocks match your search."}
              </p>
              <Button size="sm" variant="secondary" onClick={onNew}>
                <Plus className="h-3.5 w-3.5" />
                New block type
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </p>
                  {items.map((block) => (
                    <div
                      key={block.key}
                      className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 transition-all hover:border-border hover:bg-surface-subtle"
                    >
                      <button
                        type="button"
                        onClick={() => onAdd(block)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        title={block.description || `Add ${block.label}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-overlay text-muted transition-colors group-hover:bg-thunder-50 group-hover:text-thunder-600">
                          <Plus className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {block.label}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-muted">
                            {block.key}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEdit(block)}
                          className="rounded-md p-1 text-muted hover:bg-surface-overlay hover:text-foreground"
                          title={
                            block.source?.kind === "component"
                              ? "Customize this component's fields"
                              : "Edit block type"
                          }
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {block.source?.kind !== "component" && (
                          <button
                            type="button"
                            onClick={() => onDelete(block)}
                            className="rounded-md p-1 text-muted hover:bg-surface-overlay hover:text-destructive"
                            title="Delete block type"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-[11px] text-muted">
            {blocks.length} block{blocks.length === 1 ? "" : "s"} available
          </p>
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-thunder-600 transition-colors hover:bg-thunder-50"
            title="Create a manual block type"
          >
            <Plus className="h-3.5 w-3.5" />
            New block type
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
