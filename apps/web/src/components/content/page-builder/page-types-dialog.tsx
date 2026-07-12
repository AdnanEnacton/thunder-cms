"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Layers, Plus, Trash2, X } from "lucide-react";
import type { BlockDef, BlockFieldDef, BlockFieldType, PageTypeDef } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BUILTIN_KEYS = new Set(["markdown", "component"]);

const FIELD_TYPES: { value: BlockFieldType; label: string }[] = [
  { value: "string", label: "Text (short)" },
  { value: "text", label: "Text (long)" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Toggle" },
  { value: "date", label: "Date" },
  { value: "tags", label: "Tags" },
  { value: "image", label: "Image" },
  { value: "url", label: "URL" },
];

interface PageTypesDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

function slugKey(label: string): string {
  return label
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase());
}

export function PageTypesDialog({ open, projectId, onClose, onSaved }: PageTypesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blocks, setBlocks] = useState<BlockDef[]>([]);
  const [custom, setCustom] = useState<PageTypeDef[]>([]);
  const [editing, setEditing] = useState<PageTypeDef | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setEditing(null);
      const res = await fetch(`/api/projects/${projectId}/blocks`);
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      setLoading(false);
      if (res.ok) {
        setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        setCustom(
          (Array.isArray(data.pageTypes) ? data.pageTypes : []).filter(
            (p: PageTypeDef) => !BUILTIN_KEYS.has(p.key),
          ),
        );
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [open, projectId]);

  if (!open) return null;

  async function persist(next: PageTypeDef[]) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageTypes: next }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save page types");
      return false;
    }
    setCustom(
      (Array.isArray(data.pageTypes) ? data.pageTypes : next).filter(
        (p: PageTypeDef) => !BUILTIN_KEYS.has(p.key),
      ),
    );
    onSaved();
    return true;
  }

  async function saveEditing(pt: PageTypeDef) {
    const others = custom.filter((p) => p.key !== pt.key);
    const ok = await persist([...others, pt]);
    if (ok) setEditing(null);
  }

  async function deletePageType(key: string) {
    await persist(custom.filter((p) => p.key !== key));
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
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1 text-muted hover:bg-surface-overlay"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Layers className="h-4 w-4 text-thunder-600" />
            <h3 className="text-base font-semibold">
              {editing ? "Edit page type" : "Page types"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {editing ? (
          <PageTypeForm
            initial={editing}
            blocks={blocks}
            existingKeys={custom.map((p) => p.key)}
            saving={saving}
            error={error}
            onCancel={() => setEditing(null)}
            onSave={saveEditing}
          />
        ) : (
          <>
            <div className="flex-1 overflow-auto px-5 py-4">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted">Loading…</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle px-3 py-2.5 opacity-70">
                    <div>
                      <p className="text-sm font-medium">Markdown Page &amp; Component Page</p>
                      <p className="text-xs text-muted">Built-in — always available.</p>
                    </div>
                  </div>
                  {custom.map((pt) => (
                    <div
                      key={pt.key}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{pt.label}</p>
                        <p className="truncate text-xs text-muted">
                          <span className="font-mono">{pt.key}</span>
                          {pt.allowedBlocks?.length ? ` · ${pt.allowedBlocks.length} blocks` : ""}
                          {pt.fields?.length ? ` · ${pt.fields.length} fields` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(pt)}>
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => deletePageType(pt.key)}
                          className="rounded-md p-1.5 text-muted hover:bg-surface-overlay hover:text-destructive"
                          title="Delete page type"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {custom.length === 0 && (
                    <p className="px-1 py-3 text-xs text-muted">
                      No custom page types yet. Create one to pre-seed fields and limit which blocks a
                      page can use.
                    </p>
                  )}
                </div>
              )}
              {error && (
                <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end border-t border-border px-5 py-4">
              <Button
                size="sm"
                onClick={() =>
                  setEditing({ key: "", label: "", storage: "frontmatter", allowedBlocks: [], fields: [] })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                New page type
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function PageTypeForm({
  initial,
  blocks,
  existingKeys,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initial: PageTypeDef;
  blocks: BlockDef[];
  existingKeys: string[];
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: (pt: PageTypeDef) => void;
}) {
  const isNew = !initial.key;
  const [label, setLabel] = useState(initial.label);
  const [key, setKey] = useState(initial.key);
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState(initial.description ?? "");
  const [allowed, setAllowed] = useState<string[]>(initial.allowedBlocks ?? []);
  const [fields, setFields] = useState<BlockFieldDef[]>(initial.fields ?? []);
  const [localError, setLocalError] = useState("");

  function toggleAllowed(blockKey: string) {
    setAllowed((prev) =>
      prev.includes(blockKey) ? prev.filter((k) => k !== blockKey) : [...prev, blockKey],
    );
  }

  function submit() {
    const l = label.trim();
    const k = key.trim();
    if (!l) return setLocalError("Name is required.");
    if (!k) return setLocalError("Key is required.");
    if (["markdown", "component"].includes(k)) return setLocalError("That key is reserved.");
    if (isNew && existingKeys.includes(k)) return setLocalError("A page type with that key exists.");

    const cleanFields = fields
      .filter((f) => f.name.trim())
      .map((f) => ({ name: f.name.trim(), label: f.label.trim() || f.name.trim(), type: f.type }));

    const pt: PageTypeDef = {
      key: k,
      label: l,
      storage: "frontmatter",
      allowedBlocks: allowed,
      fields: cleanFields,
    };
    if (description.trim()) pt.description = description.trim();
    onSave(pt);
  }

  return (
    <>
      <div className="flex-1 space-y-5 overflow-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (isNew && !keyTouched) setKey(slugKey(e.target.value));
              }}
              placeholder="Landing Page"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Key</Label>
            <Input
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(e.target.value);
              }}
              placeholder="landing"
              disabled={!isNew}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Marketing landing page with hero + features"
          />
        </div>

        <div className="space-y-2">
          <Label>Allowed blocks</Label>
          <p className="text-xs text-muted">
            Leave all unchecked to allow every block. Otherwise only the checked blocks can be added.
          </p>
          {blocks.length === 0 ? (
            <p className="text-xs text-muted">No blocks defined yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {blocks.map((b) => {
                const on = allowed.includes(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => toggleAllowed(b.key)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on
                        ? "border-thunder-300 bg-thunder-50 text-thunder-700"
                        : "border-border text-muted hover:border-thunder-200",
                    )}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Seeded frontmatter fields</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFields((prev) => [...prev, { name: "", label: "", type: "string" }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add field
            </Button>
          </div>
          {fields.map((field, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={field.label}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((f, idx) =>
                      idx === i
                        ? { ...f, label: e.target.value, name: f.name || slugKey(e.target.value) }
                        : f,
                    ),
                  )
                }
                placeholder="Field label"
              />
              <Input
                value={field.name}
                onChange={(e) =>
                  setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, name: e.target.value } : f)))
                }
                placeholder="key"
                className="w-32 font-mono text-xs"
              />
              <Select
                value={field.type}
                onChange={(v) =>
                  setFields((prev) =>
                    prev.map((f, idx) => (idx === i ? { ...f, type: v as BlockFieldType } : f)),
                  )
                }
                options={FIELD_TYPES}
                className="w-40"
              />
              <button
                type="button"
                onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-md p-1.5 text-muted hover:bg-surface-overlay hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {(localError || error) && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {localError || error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Save page type"}
        </Button>
      </div>
    </>
  );
}
