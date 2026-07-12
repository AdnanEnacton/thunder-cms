"use client";

import { Blocks, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { BlockDef } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlockPaletteProps {
  blocks: BlockDef[];
  loading?: boolean;
  onAdd: (def: BlockDef) => void;
  onEdit: (def: BlockDef) => void;
  onDelete: (def: BlockDef) => void;
  onNew: () => void;
  onRefresh?: () => void;
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

export function BlockPalette({
  blocks,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onNew,
  onRefresh,
}: BlockPaletteProps) {
  const groups = groupByCategory(blocks);

  return (
    <div className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Blocks</p>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className={cn(
                "rounded-md p-1 text-muted transition-colors hover:bg-surface-overlay hover:text-thunder-600",
                loading && "animate-spin",
              )}
              title="Re-read components from your repo"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-thunder-600 transition-colors hover:bg-thunder-50"
            title="Create a manual block type"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <p className="px-1 py-2 text-xs text-muted">Loading blocks…</p>
        ) : blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-overlay">
              <Blocks className="h-5 w-5 text-muted" />
            </div>
            <p className="text-xs text-muted">
              No components found in your components folder yet. Add components there, or create a
              manual block type.
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
                    className={cn(
                      "group flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 transition-all",
                      "hover:border-border hover:bg-surface-subtle",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onAdd(block)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      title={block.description || `Add ${block.label}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-overlay text-muted transition-colors group-hover:bg-thunder-50 group-hover:text-thunder-600">
                        <Plus className="h-3.5 w-3.5" />
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
    </div>
  );
}
