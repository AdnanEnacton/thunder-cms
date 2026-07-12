"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  GripVertical,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import type { BlockDef, PageBlock, PageTypeDef } from "@thunder/types";
import {
  BLOCKS_KEY,
  createBlockInstance,
  findBlockDef,
} from "@/lib/blocks/registry";
import { humanizeFieldKey } from "@/lib/content/field-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { BlockPalette } from "./block-palette";
import { BlockFieldPanel } from "./block-field-panel";
import { BlockDefDialog } from "./block-def-dialog";
import { RendererDialog } from "./renderer-dialog";

interface PageBuilderProps {
  projectId: string;
  frontmatter: Record<string, unknown>;
  onFrontmatterChange: (frontmatter: Record<string, unknown>) => void;
}

function readBlocks(frontmatter: Record<string, unknown>): PageBlock[] {
  const raw = frontmatter[BLOCKS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is PageBlock => !!b && typeof b === "object" && !Array.isArray(b),
  );
}

export function PageBuilder({
  projectId,
  frontmatter,
  onFrontmatterChange,
}: PageBuilderProps) {
  // `registry` is the effective block list (folder components merged with DB
  // overrides). `overrides` is the raw DB registry we mutate when authoring.
  const [registry, setRegistry] = useState<BlockDef[]>([]);
  const [overrides, setOverrides] = useState<BlockDef[]>([]);
  const [pageTypeDefs, setPageTypeDefs] = useState<PageTypeDef[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [selected, setSelected] = useState<number | "page" | null>("page");
  const [rendererOpen, setRendererOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<BlockDef | null>(null);
  const [savingDef, setSavingDef] = useState(false);
  const [defError, setDefError] = useState("");
  const [deletingDef, setDeletingDef] = useState<BlockDef | null>(null);

  const pageBlocks = useMemo(() => readBlocks(frontmatter), [frontmatter]);

  const reload = useCallback(async () => {
    setRegistryLoading(true);
    const res = await fetch(`/api/projects/${projectId}/blocks/effective`);
    if (res.ok) {
      const data = await res.json();
      setRegistry(Array.isArray(data.blocks) ? data.blocks : []);
      setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
      setPageTypeDefs(Array.isArray(data.pageTypes) ? data.pageTypes : []);
    }
    setRegistryLoading(false);
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function setBlocks(next: PageBlock[]) {
    onFrontmatterChange({ ...frontmatter, [BLOCKS_KEY]: next });
  }

  function addBlock(def: BlockDef) {
    const next = [...pageBlocks, createBlockInstance(def)];
    setBlocks(next);
    setSelected(next.length - 1);
  }

  function updateBlock(index: number, value: PageBlock) {
    setBlocks(pageBlocks.map((b, i) => (i === index ? value : b)));
  }

  function removeBlock(index: number) {
    setBlocks(pageBlocks.filter((_, i) => i !== index));
    setSelected((prev) => {
      if (prev === "page" || prev === null) return prev;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }

  function duplicateBlock(index: number) {
    const copy: PageBlock = JSON.parse(JSON.stringify(pageBlocks[index]));
    const next = [...pageBlocks.slice(0, index + 1), copy, ...pageBlocks.slice(index + 1)];
    setBlocks(next);
    setSelected(index + 1);
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= pageBlocks.length) return;
    const next = [...pageBlocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
    setSelected(target);
  }

  // ---- Registry (block-definition) CRUD ----
  // We only ever persist the DB `overrides` list; folder-discovered blocks stay
  // folder-driven. Editing a component-backed block writes/updates an override
  // for its key; a "New block type" adds a manual block.

  async function persistOverrides(next: BlockDef[]): Promise<boolean> {
    const res = await fetch(`/api/projects/${projectId}/blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDefError(data.error ?? "Failed to save block");
      return false;
    }
    await reload();
    return true;
  }

  async function saveDef(def: BlockDef) {
    setSavingDef(true);
    setDefError("");
    const exists = overrides.some((b) => b.key === def.key);
    const next = exists
      ? overrides.map((b) => (b.key === def.key ? def : b))
      : [...overrides, def];
    const ok = await persistOverrides(next);
    setSavingDef(false);
    if (ok) {
      setDialogOpen(false);
      setEditingDef(null);
    }
  }

  async function confirmDeleteDef() {
    if (!deletingDef) return;
    const next = overrides.filter((b) => b.key !== deletingDef.key);
    await persistOverrides(next);
    setDeletingDef(null);
  }

  const selectedDef =
    typeof selected === "number"
      ? findBlockDef(registry, pageBlocks[selected]?._template)
      : undefined;

  // If the page's type restricts blocks, only offer the allowed ones in the palette.
  const currentPageType = pageTypeDefs.find((p) => p.key === frontmatter.type);
  const allowed = currentPageType?.allowedBlocks;
  const paletteBlocks =
    allowed && allowed.length ? registry.filter((b) => allowed.includes(b.key)) : registry;

  return (
    <div className="flex h-full min-h-0 flex-1">
      <BlockPalette
        blocks={paletteBlocks}
        loading={registryLoading}
        onAdd={addBlock}
        onEdit={(def) => {
          setEditingDef(def);
          setDialogOpen(true);
        }}
        onDelete={(def) => setDeletingDef(def)}
        onNew={() => {
          setEditingDef(null);
          setDialogOpen(true);
        }}
        onRefresh={reload}
      />

      {/* Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Page canvas</p>
          <button
            type="button"
            onClick={() => setRendererOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-overlay hover:text-thunder-600"
            title="Generate the renderer for your framework"
          >
            <Code2 className="h-3.5 w-3.5" />
            Renderer
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-xl space-y-2">
            <CanvasRow
              active={selected === "page"}
              onClick={() => setSelected("page")}
              label="Page settings"
              sublabel="Title & frontmatter"
              icon={<Settings2 className="h-4 w-4" />}
            />

            {pageBlocks.map((block, index) => {
              const def = findBlockDef(registry, block._template);
              const label = def?.label ?? humanizeFieldKey(String(block._template ?? "Block"));
              return (
                <div
                  key={index}
                  className={cn(
                    "group flex items-center gap-2 rounded-xl border bg-surface-raised px-3 py-2.5 transition-all",
                    selected === index
                      ? "border-thunder-300 shadow-sm ring-1 ring-thunder-500/20"
                      : "border-border hover:border-border hover:shadow-xs",
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setSelected(index)}
                    className="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <span className="truncate text-sm font-medium text-foreground">{label}</span>
                    <span className="truncate font-mono text-[10px] text-muted">
                      {String(block._template ?? "")}
                      {!def && " · unrecognized"}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn title="Move up" disabled={index === 0} onClick={() => moveBlock(index, -1)}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title="Move down"
                      disabled={index === pageBlocks.length - 1}
                      onClick={() => moveBlock(index, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => duplicateBlock(index)}>
                      <Copy className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn title="Delete" danger onClick={() => removeBlock(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              );
            })}

            {pageBlocks.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-overlay">
                  <Plus className="h-5 w-5 text-muted" />
                </div>
                <p className="text-sm font-medium">No blocks yet</p>
                <p className="text-xs text-muted">
                  Add blocks from the palette on the left to compose this page.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field panel */}
      <div className="flex w-[min(420px,38%)] shrink-0 flex-col overflow-auto border-l border-border bg-surface-raised">
        <BlockFieldPanel
          projectId={projectId}
          selected={selected}
          frontmatter={frontmatter}
          onFrontmatterChange={onFrontmatterChange}
          blocks={pageBlocks}
          onBlockChange={updateBlock}
          def={selectedDef}
        />
      </div>

      <BlockDefDialog
        open={dialogOpen}
        initial={editingDef}
        existingKeys={registry.map((b) => b.key)}
        saving={savingDef}
        onClose={() => {
          setDialogOpen(false);
          setEditingDef(null);
          setDefError("");
        }}
        onSave={saveDef}
      />

      <RendererDialog
        open={rendererOpen}
        projectId={projectId}
        onClose={() => setRendererOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deletingDef)}
        title={`Delete "${deletingDef?.label}" block type?`}
        description="This removes the block definition from the registry. Existing blocks of this type on pages stay but become unrecognized."
        confirmLabel="Delete block type"
        variant="destructive"
        onConfirm={confirmDeleteDef}
        onCancel={() => setDeletingDef(null)}
      />

      {defError && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[9998] -translate-x-1/2">
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm text-destructive shadow">
            {defError}
          </p>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md p-1 text-muted transition-colors disabled:opacity-30",
        danger ? "hover:bg-surface-overlay hover:text-destructive" : "hover:bg-surface-overlay hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CanvasRow({
  active,
  onClick,
  label,
  sublabel,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
        active
          ? "border-thunder-300 bg-surface-raised shadow-sm ring-1 ring-thunder-500/20"
          : "border-border bg-surface-raised hover:shadow-xs",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-overlay text-muted">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        <span className="block truncate text-[11px] text-muted">{sublabel}</span>
      </span>
    </button>
  );
}
