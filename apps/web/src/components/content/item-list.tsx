"use client";

import { useState } from "react";
import { ArrowLeft, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { getListItemLabel, humanizeFieldKey } from "@/lib/content/field-ui";
import { VisualValueEditor } from "@/components/content/visual-value-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface ItemListProps {
  fieldKey: string;
  items: unknown[];
  onChange: (items: unknown[]) => void;
  templateOptions?: string[];
  projectId?: string;
}

const ROW_VARIANTS = [
  {
    bar: "bg-thunder-500",
    bg: "bg-thunder-50/80 hover:bg-thunder-50 dark:bg-thunder-500/10 dark:hover:bg-thunder-500/15",
    badge: "bg-thunder-100 text-thunder-700 dark:bg-thunder-500/15 dark:text-thunder-300",
    active: "ring-thunder-200 dark:ring-thunder-500/30",
  },
  {
    bar: "bg-violet-500",
    bg: "bg-violet-50/80 hover:bg-violet-50 dark:bg-violet-500/10 dark:hover:bg-violet-500/15",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    active: "ring-violet-200 dark:ring-violet-500/30",
  },
  {
    bar: "bg-emerald-500",
    bg: "bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    active: "ring-emerald-200 dark:ring-emerald-500/30",
  },
  {
    bar: "bg-amber-500",
    bg: "bg-amber-50/80 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    active: "ring-amber-200 dark:ring-amber-500/30",
  },
] as const;

function cloneItemTemplate(items: unknown[]): Record<string, unknown> {
  const sample = items.find(
    (item) => typeof item === "object" && item !== null && !Array.isArray(item),
  ) as Record<string, unknown> | undefined;

  if (!sample) return {};

  const template: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "boolean") template[key] = false;
    else if (typeof value === "number") template[key] = 0;
    else if (typeof value === "string") template[key] = "";
    else if (Array.isArray(value)) template[key] = [];
    else if (typeof value === "object" && value !== null) template[key] = {};
    else template[key] = "";
  }
  return template;
}

export function ItemList({ fieldKey, items, onChange, templateOptions, projectId }: ItemListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const label = humanizeFieldKey(fieldKey);

  function handleAdd() {
    onChange([...items, cloneItemTemplate(items)]);
  }

  function confirmDelete() {
    if (deleteIndex === null) return;
    const index = deleteIndex;
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
    setDeleteIndex(null);
  }

  function handleUpdate(index: number, value: unknown) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function handleReorder(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    if (editingIndex === from) setEditingIndex(to);
  }

  if (editingIndex !== null && items[editingIndex] !== undefined) {
    const variant = ROW_VARIANTS[editingIndex % ROW_VARIANTS.length];

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEditingIndex(null)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-thunder-600 shadow-xs transition-colors hover:bg-thunder-50 hover:text-thunder-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {label}
        </button>

        <div className={cn("rounded-xl border border-border p-4", variant.bg)}>
          <div className="mb-4 flex items-center gap-2">
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", variant.badge)}>
              {getListItemLabel(fieldKey, editingIndex)}
            </span>
          </div>
          <VisualValueEditor
            fieldKey={`${fieldKey}[${editingIndex}]`}
            value={items[editingIndex]}
            templateOptions={templateOptions}
            onChange={(value) => handleUpdate(editingIndex, value)}
            variant="flat"
            projectId={projectId}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight text-foreground">{label}</p>
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-thunder-600 text-white shadow-sm transition-all hover:bg-thunder-700 hover:shadow-md"
            title={`Add ${label} item`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface-subtle px-4 py-4 text-center text-sm text-muted">
            No items yet. Click + to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              const variant = ROW_VARIANTS[index % ROW_VARIANTS.length];
              const itemLabel = getListItemLabel(fieldKey, index);

              return (
                <div
                  key={index}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) handleReorder(dragIndex, index);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "group relative flex items-center gap-2 overflow-hidden rounded-xl border border-border pl-0 pr-2 shadow-xs transition-all",
                    variant.bg,
                    dragIndex === index && "opacity-50",
                    "hover:shadow-sm",
                  )}
                >
                  <div className={cn("w-1 shrink-0 self-stretch", variant.bar)} />

                  <button
                    type="button"
                    className="cursor-grab px-1 text-muted/70 transition-colors hover:text-foreground active:cursor-grabbing"
                    tabIndex={-1}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold", variant.badge)}>
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1 truncate py-3 text-sm font-medium text-foreground">
                    {itemLabel}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditingIndex(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted shadow-xs transition-all hover:border-thunder-300 hover:bg-thunder-50 hover:text-thunder-600"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted shadow-xs transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteIndex !== null}
        title="Delete this item?"
        description={
          deleteIndex !== null
            ? `"${getListItemLabel(fieldKey, deleteIndex)}" will be removed. This change saves when you click Save.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
}