"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { SHORTCODES, type Shortcode } from "./mdx-shortcodes";
import { cn } from "@/lib/utils";

interface ShortcodeDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (mdx: string) => void;
}

/**
 * Insert-MDX-component dialog (Phase 5.4). Pick a component, fill its props, see
 * the generated MDX live, and insert it at the caret. Source-level — the MDX the
 * target site renders at build time.
 */
export function ShortcodeDialog({ open, onClose, onInsert }: ShortcodeDialogProps) {
  const [selectedId, setSelectedId] = useState<string>(SHORTCODES[0].id);
  const [values, setValues] = useState<Record<string, string>>({});

  const selected: Shortcode =
    SHORTCODES.find((s) => s.id === selectedId) ?? SHORTCODES[0];

  const preview = useMemo(() => selected.build(values), [selected, values]);

  if (!open) return null;

  function choose(id: string) {
    setSelectedId(id);
    // Seed defaults for the newly chosen component.
    const sc = SHORTCODES.find((s) => s.id === id);
    const seeded: Record<string, string> = {};
    sc?.fields.forEach((f) => {
      if (f.default) seeded[f.name] = f.default;
    });
    setValues(seeded);
  }

  function insert() {
    onInsert(`\n\n${preview}\n\n`);
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Component list */}
        <div className="w-52 shrink-0 overflow-auto border-r border-border bg-surface-subtle p-2">
          {SHORTCODES.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => choose(sc.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  sc.id === selectedId
                    ? "bg-thunder-50 text-thunder-700 dark:bg-thunder-500/15 dark:text-thunder-300"
                    : "text-foreground hover:bg-surface-overlay",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{sc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Editor for the selected component */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold">{selected.label}</h2>
              <p className="text-xs text-muted">{selected.description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-overlay"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
            {selected.fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-xs font-medium text-muted">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-thunder-400"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={values[field.name] ?? field.default ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-thunder-400"
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "url" ? "url" : "text"}
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-thunder-400"
                  />
                )}
              </div>
            ))}

            <div>
              <p className="mb-1 text-xs font-medium text-muted">Preview</p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-foreground">
                {preview}
              </pre>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-overlay"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insert}
              className="rounded-lg bg-thunder-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-thunder-700"
            >
              Insert component
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
