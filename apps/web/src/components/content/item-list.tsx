"use client";

import { useState } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { getListItemLabel, humanizeFieldKey } from "@/lib/content/field-ui";
import { VisualValueEditor } from "@/components/content/visual-value-editor";
import { cn } from "@/lib/utils";

interface ItemListProps {
  fieldKey: string;
  items: unknown[];
  onChange: (items: unknown[]) => void;
  templateOptions?: string[];
  projectId?: string;
}

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
  const label = humanizeFieldKey(fieldKey);

  function handleAdd() {
    onChange([...items, cloneItemTemplate(items)]);
  }

  function handleDelete(index: number) {
    if (!confirm("Delete this item?")) return;
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
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
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEditingIndex(null)}
          className="text-sm text-thunder-600 hover:underline"
        >
          ← Back to {label}
        </button>
        <h4 className="text-sm font-semibold text-foreground">
          {getListItemLabel(fieldKey, editingIndex)}
        </h4>
        <VisualValueEditor
          fieldKey={`${fieldKey}[${editingIndex}]`}
          value={items[editingIndex]}
          templateOptions={templateOptions}
          onChange={(value) => handleUpdate(editingIndex, value)}
          variant="flat"
          projectId={projectId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <button
          type="button"
          onClick={handleAdd}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
          title={`Add ${label} item`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
          No items yet. Click + to add one.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {items.map((item, index) => (
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
                "flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0",
                dragIndex === index && "opacity-50",
              )}
            >
              <button
                type="button"
                className="cursor-grab text-muted hover:text-foreground active:cursor-grabbing"
                tabIndex={-1}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <span className="flex-1 text-sm text-foreground">
                {getListItemLabel(fieldKey, index)}
              </span>
              <button
                type="button"
                onClick={() => setEditingIndex(index)}
                className="rounded p-1 text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="rounded p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}