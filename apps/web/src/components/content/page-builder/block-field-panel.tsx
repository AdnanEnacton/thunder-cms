"use client";

import type { BlockDef, PageBlock } from "@thunder/types";
import { FieldInput } from "@/components/content/field-input";
import { VisualValueEditor } from "@/components/content/visual-value-editor";
import { inferFieldSchema } from "@/lib/content/schema";
import { humanizeFieldKey } from "@/lib/content/field-ui";
import { BLOCKS_KEY } from "@/lib/blocks/registry";

interface BlockFieldPanelProps {
  projectId: string;
  selected: number | "page" | null;
  frontmatter: Record<string, unknown>;
  onFrontmatterChange: (frontmatter: Record<string, unknown>) => void;
  blocks: PageBlock[];
  onBlockChange: (index: number, value: PageBlock) => void;
  def?: BlockDef;
}

/** Frontmatter keys that the page builder manages itself and shouldn't list as page fields. */
const HIDDEN_PAGE_KEYS = new Set(["type", BLOCKS_KEY]);

export function BlockFieldPanel({
  projectId,
  selected,
  frontmatter,
  onFrontmatterChange,
  blocks,
  onBlockChange,
  def,
}: BlockFieldPanelProps) {
  if (selected === null) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-muted">
          Select a block on the canvas to edit its content, or choose Page settings.
        </p>
      </div>
    );
  }

  if (selected === "page") {
    const keys = Object.keys(frontmatter).filter((k) => !HIDDEN_PAGE_KEYS.has(k));
    return (
      <div className="space-y-5">
        <PanelHeader title="Page settings" subtitle="Frontmatter fields for this page." />
        <div className="space-y-5 px-5 pb-6">
          {keys.length === 0 && (
            <p className="text-sm text-muted">This page has no extra frontmatter fields.</p>
          )}
          {keys.map((key) => (
            <FieldInput
              key={key}
              field={inferFieldSchema(key, frontmatter[key])}
              value={frontmatter[key]}
              onChange={(v) => onFrontmatterChange({ ...frontmatter, [key]: v })}
              compact
              projectId={projectId}
            />
          ))}
        </div>
      </div>
    );
  }

  const block = blocks[selected];
  if (!block) return null;

  // Hide the _template discriminator from the editable surface; merge it back on change.
  const { _template, ...editable } = block;
  const title = def?.label ?? humanizeFieldKey(String(_template ?? "Block"));

  return (
    <div className="space-y-5">
      <PanelHeader
        title={title}
        subtitle={def?.description ?? (def ? undefined : "Unrecognized block — editing raw fields.")}
      />
      <div className="px-5 pb-6">
        <VisualValueEditor
          fieldKey={`block-${selected}`}
          value={editable}
          blockFields={def?.fields}
          onChange={(next) =>
            onBlockChange(selected, { _template: String(_template ?? ""), ...(next as object) })
          }
          variant="flat"
          projectId={projectId}
        />
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border px-5 py-3">
      <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
