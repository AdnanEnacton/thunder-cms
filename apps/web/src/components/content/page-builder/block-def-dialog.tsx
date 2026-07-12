"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Blocks, Plus, Trash2, X } from "lucide-react";
import type { BlockDef, BlockFieldDef, BlockFieldType } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const FIELD_TYPES: { value: BlockFieldType; label: string }[] = [
  { value: "string", label: "Text (short)" },
  { value: "text", label: "Text (long)" },
  { value: "richtext", label: "Rich text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Toggle" },
  { value: "date", label: "Date" },
  { value: "tags", label: "Tags / list" },
  { value: "image", label: "Image" },
  { value: "url", label: "URL / link" },
  { value: "select", label: "Select (options)" },
  { value: "color", label: "Color" },
  { value: "object", label: "Group (object)" },
  { value: "array", label: "Repeatable list" },
];

interface BlockDefDialogProps {
  open: boolean;
  /** The block being edited, or null when creating a new one. */
  initial: BlockDef | null;
  /** Existing block keys, to prevent duplicates when creating. */
  existingKeys: string[];
  saving?: boolean;
  onClose: () => void;
  onSave: (def: BlockDef) => void;
}

function slugifyKey(label: string): string {
  return label
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function slugifyFieldName(label: string): string {
  return slugifyKey(label) || "field";
}

export function BlockDefDialog({
  open,
  initial,
  existingKeys,
  saving = false,
  onClose,
  onSave,
}: BlockDefDialogProps) {
  const isEdit = Boolean(initial);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<BlockFieldDef[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setKeyTouched(false);
    if (initial) {
      setLabel(initial.label);
      setKey(initial.key);
      setCategory(initial.category ?? "");
      setDescription(initial.description ?? "");
      setFields(initial.fields.map((f) => ({ ...f })));
    } else {
      setLabel("");
      setKey("");
      setCategory("");
      setDescription("");
      setFields([{ name: "heading", label: "Heading", type: "string" }]);
    }
  }, [open, initial]);

  if (!open) return null;

  function updateLabel(next: string) {
    setLabel(next);
    if (!isEdit && !keyTouched) setKey(slugifyKey(next));
  }

  function addField() {
    setFields((prev) => [...prev, { name: `field${prev.length + 1}`, label: "", type: "string" }]);
  }

  function updateField(index: number, patch: Partial<BlockFieldDef>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim();
    if (!trimmedLabel) return setError("Give the block a name.");
    if (!trimmedKey) return setError("A block key is required.");
    if (!isEdit && existingKeys.includes(trimmedKey)) {
      return setError(`A block with key "${trimmedKey}" already exists.`);
    }
    if (fields.length === 0) return setError("Add at least one field.");

    const normalizedFields: BlockFieldDef[] = fields.map((f, i) => {
      const name = (f.name || slugifyFieldName(f.label) || `field${i + 1}`).trim();
      const fieldLabel = f.label.trim() || name;
      const def: BlockFieldDef = { name, label: fieldLabel, type: f.type };
      if (f.type === "select" && f.options?.length) def.options = f.options;
      if (f.help?.trim()) def.help = f.help.trim();
      return def;
    });

    const names = normalizedFields.map((f) => f.name);
    if (new Set(names).size !== names.length) {
      return setError("Field keys must be unique.");
    }

    const def: BlockDef = {
      key: trimmedKey,
      label: trimmedLabel,
      fields: normalizedFields,
      source: initial?.source ?? { kind: "manual" },
    };
    if (category.trim()) def.category = category.trim();
    if (description.trim()) def.description = description.trim();
    if (initial?.icon) def.icon = initial.icon;
    if (initial?.previewImage) def.previewImage = initial.previewImage;

    onSave(def);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Blocks className="h-4 w-4 text-thunder-600" />
            <h3 className="text-base font-semibold">{isEdit ? "Edit block type" : "New block type"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="block-label">Name</Label>
              <Input
                id="block-label"
                value={label}
                onChange={(e) => updateLabel(e.target.value)}
                placeholder="Hero"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-key">Key (_template)</Label>
              <Input
                id="block-key"
                value={key}
                onChange={(e) => {
                  setKeyTouched(true);
                  setKey(e.target.value);
                }}
                placeholder="hero"
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="block-category">Category (optional)</Label>
              <Input
                id="block-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-desc">Description (optional)</Label>
              <Input
                id="block-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full-width intro banner"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button variant="ghost" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5" />
                Add field
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-border bg-surface-subtle p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const nextLabel = e.target.value;
                          const autoName =
                            !field.name || field.name === slugifyFieldName(field.label);
                          updateField(index, {
                            label: nextLabel,
                            ...(autoName ? { name: slugifyFieldName(nextLabel) } : {}),
                          });
                        }}
                        placeholder="Field label"
                      />
                      <Input
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder="fieldKey"
                        className="font-mono text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="mt-2 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-overlay hover:text-destructive"
                      title="Remove field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={field.type}
                      onChange={(v) => updateField(index, { type: v as BlockFieldType })}
                      options={FIELD_TYPES}
                    />
                    {field.type === "select" ? (
                      <Input
                        value={(field.options ?? []).join(", ")}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="option1, option2"
                      />
                    ) : (
                      <Input
                        value={field.help ?? ""}
                        onChange={(e) => updateField(index, { help: e.target.value })}
                        placeholder="Help text (optional)"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create block"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
