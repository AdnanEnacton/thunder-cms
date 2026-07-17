"use client";

import type { BlockFieldDef } from "@thunder/types";
import { ImageFieldInput } from "@/components/content/image-field-input";
import { RichTextFieldInput } from "@/components/content/richtext-field-input";
import {
  collectTemplateOptions,
  type ControlKind,
  controlFromBlockFieldType,
  getArrayItemLabel,
  humanizeFieldKey,
  inferControlKind,
  sortObjectKeys,
} from "@/lib/content/field-ui";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type EditorVariant = "default" | "flat";

interface VisualValueEditorProps {
  label?: string;
  fieldKey?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
  templateOptions?: string[];
  variant?: EditorVariant;
  projectId?: string;
  /** Force a specific control (from a BlockDef field) instead of inferring one. */
  controlOverride?: ControlKind | null;
  /** Options for a `select` control (from a BlockDef field). */
  options?: string[];
  /** Helper text shown under the control. */
  help?: string;
  /** Schema for this object's children (when value is an object/block). */
  blockFields?: BlockFieldDef[];
  /** Schema for each item (when value is an array with a defined item shape). */
  itemFields?: BlockFieldDef[];
}

export function VisualValueEditor({
  label,
  fieldKey = "root",
  value,
  onChange,
  depth = 0,
  templateOptions,
  variant = "default",
  projectId,
  controlOverride,
  options,
  help,
  blockFields,
  itemFields,
}: VisualValueEditorProps) {
  const control = controlOverride ?? inferControlKind(fieldKey, value);
  const id = `field-${fieldKey}-${depth}`;

  // With no schema opinion, an absent value renders as an inert "Empty" chip.
  // A schema-driven field (controlOverride set) instead renders an editable,
  // zero-valued control so newly-defined fields can be filled in.
  if ((value === null || value === undefined) && !controlOverride) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-overlay/50 px-3 py-2 text-sm text-muted">
        {label ? `${label}: ` : ""}Empty
      </div>
    );
  }

  if (control === "object") {
    return (
      <ObjectEditor
        label={label}
        fieldKey={fieldKey}
        value={(value ?? {}) as Record<string, unknown>}
        onChange={onChange}
        depth={depth}
        templateOptions={templateOptions}
        variant={variant}
        projectId={projectId}
        blockFields={blockFields}
      />
    );
  }

  if (control === "array") {
    return (
      <ArrayEditor
        label={label}
        fieldKey={fieldKey}
        value={(value ?? []) as unknown[]}
        onChange={onChange}
        depth={depth}
        variant={variant}
        projectId={projectId}
        itemFields={itemFields}
      />
    );
  }

  if (control === "toggle") {
    if (variant === "flat") {
      return (
        <div className="flex items-center justify-between gap-4 py-1">
          <Label className="text-sm font-medium text-foreground">
            {label ?? humanizeFieldKey(fieldKey)}
          </Label>
          <Switch id={id} checked={Boolean(value)} onChange={onChange} />
        </div>
      );
    }

    return (
      <FieldRow label={label ?? humanizeFieldKey(fieldKey)}>
        <Switch id={id} checked={Boolean(value)} onChange={onChange} />
      </FieldRow>
    );
  }

  if (control === "select") {
    const source = options?.length
      ? options
      : templateOptions?.length
        ? templateOptions
        : typeof value === "string" && value
          ? [value]
          : [];
    const selectOptions = source.map((option) => ({
      value: option,
      label: humanizeFieldKey(option),
    }));

    return (
      <div className={variant === "flat" ? "space-y-1.5" : "space-y-2"}>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label ?? humanizeFieldKey(fieldKey)}
        </Label>
        <Select
          id={id}
          value={String(value ?? "")}
          onChange={onChange}
          options={selectOptions}
        />
        {help && <FieldHelp text={help} />}
      </div>
    );
  }

  if (control === "tags") {
    const tags = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return (
      <div className={variant === "flat" ? "space-y-1.5" : "space-y-2"}>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label ?? humanizeFieldKey(fieldKey)}
        </Label>
        <Input
          id={id}
          value={tags}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }
          placeholder="tag1, tag2, tag3"
        />
      </div>
    );
  }

  if (control === "image") {
    return (
      <ImageFieldInput
        id={id}
        label={label ?? humanizeFieldKey(fieldKey)}
        value={String(value ?? "")}
        onChange={onChange}
        projectId={projectId}
        variant={variant}
      />
    );
  }

  if (control === "richtext") {
    return (
      <RichTextFieldInput
        id={id}
        label={label ?? humanizeFieldKey(fieldKey)}
        value={String(value ?? "")}
        onChange={onChange}
        variant={variant}
        help={help}
      />
    );
  }

  if (control === "textarea") {
    const keyLower = fieldKey.toLowerCase();
    const isLongText =
      keyLower.includes("description") ||
      keyLower.includes("keyword") ||
      keyLower.includes("paragraph") ||
      keyLower.includes("content");
    const rows = isLongText ? (variant === "flat" ? 6 : 7) : variant === "flat" ? 4 : 5;

    return (
      <div className={variant === "flat" ? "space-y-1.5" : "space-y-2"}>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label ?? humanizeFieldKey(fieldKey)}
        </Label>
        <textarea
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={
            variant === "flat"
              ? "flex min-h-[120px] w-full resize-y rounded-[10px] border border-border bg-surface-raised px-3.5 py-2.5 text-sm leading-relaxed focus:border-thunder-500 focus:outline-none focus:ring-2 focus:ring-thunder-500/20"
              : "flex min-h-[140px] w-full resize-y rounded-[10px] border border-border bg-surface-raised px-3.5 py-2.5 text-sm leading-relaxed shadow-xs focus:border-thunder-500 focus:outline-none focus:ring-2 focus:ring-thunder-500/20"
          }
        />
        {help && <FieldHelp text={help} />}
      </div>
    );
  }

  const inputType = control === "number" ? "number" : control === "url" ? "url" : "text";

  return (
    <div className={variant === "flat" ? "space-y-1.5" : "space-y-2"}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label ?? humanizeFieldKey(fieldKey)}
      </Label>
      <Input
        id={id}
        type={inputType}
        value={String(value ?? "")}
        onChange={(e) => {
          if (control === "number") {
            onChange(e.target.value === "" ? "" : Number(e.target.value));
          } else {
            onChange(e.target.value);
          }
        }}
      />
      {help && <FieldHelp text={help} />}
    </div>
  );
}

function FieldHelp({ text }: { text: string }) {
  return <p className="text-xs text-muted">{text}</p>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-sm">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ObjectEditor({
  label,
  fieldKey,
  value,
  onChange,
  depth,
  templateOptions,
  variant,
  projectId,
  blockFields,
}: {
  label?: string;
  fieldKey: string;
  value: Record<string, unknown>;
  onChange: (value: unknown) => void;
  depth: number;
  templateOptions?: string[];
  variant: EditorVariant;
  projectId?: string;
  blockFields?: BlockFieldDef[];
}) {
  const isNestedGroup = depth > 0;
  // An explicit empty-string label means the caller (e.g. an array item wrapper
  // that already rendered its own "Faqs Item 2 / Remove" header) opts out of
  // this component's own group heading, to avoid showing the same label twice.
  const groupLabel = label !== undefined ? label : humanizeFieldKey(fieldKey);
  const isFlat = variant === "flat";
  const fieldSpacing = isFlat ? "space-y-4" : "space-y-4";

  // Schema-driven order: defined fields first (in their declared order), then any
  // extra keys present on the value but not in the schema — rendered via inference.
  const defByName = new Map((blockFields ?? []).map((f) => [f.name, f]));
  const schemaKeys = (blockFields ?? []).map((f) => f.name);
  const extraKeys = sortObjectKeys(Object.keys(value).filter((k) => !defByName.has(k)));
  const orderedKeys = blockFields?.length ? [...schemaKeys, ...extraKeys] : sortObjectKeys(Object.keys(value));

  const fields = (
    <div className={fieldSpacing}>
      {orderedKeys.map((key) => {
        const def = defByName.get(key);
        const override = def ? controlFromBlockFieldType(def.type) : undefined;
        return (
          <VisualValueEditor
            key={key}
            fieldKey={key}
            label={def?.label ?? humanizeFieldKey(key)}
            value={value[key]}
            templateOptions={
              key === "_template" || key === "template" ? templateOptions : undefined
            }
            onChange={(next) => onChange({ ...value, [key]: next })}
            depth={depth + 1}
            variant={variant}
            projectId={projectId}
            controlOverride={override}
            options={def?.options}
            help={def?.help}
            blockFields={def?.fields}
            itemFields={def?.of?.fields}
          />
        );
      })}
    </div>
  );

  if (isNestedGroup && !isFlat) {
    return (
      <CollapsibleCard title={groupLabel} size="compact" defaultOpen={false}>
        {fields}
      </CollapsibleCard>
    );
  }

  if (isNestedGroup && isFlat) {
    return (
      <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
        {groupLabel && <p className="text-sm font-medium text-foreground">{groupLabel}</p>}
        {fields}
      </div>
    );
  }

  return (
    <div className={fieldSpacing}>
      {label && depth === 0 && !isFlat && (
        <h4 className="text-base font-semibold text-foreground">{label}</h4>
      )}
      {fields}
    </div>
  );
}

function ArrayEditor({
  label,
  fieldKey,
  value,
  onChange,
  depth,
  variant,
  projectId,
  itemFields,
}: {
  label?: string;
  fieldKey: string;
  value: unknown[];
  onChange: (value: unknown) => void;
  depth: number;
  variant: EditorVariant;
  projectId?: string;
  itemFields?: BlockFieldDef[];
}) {
  const templateOptions = fieldKey === "sections" ? collectTemplateOptions(value) : undefined;
  const isSections = fieldKey === "sections";
  const isFlat = variant === "flat";
  const itemLabelSingular = humanizeFieldKey(fieldKey).replace(/s$/, "") || "item";

  function addItem() {
    onChange([...value, itemFields?.length ? buildFromFields(itemFields) : blankClone(value)]);
  }

  return (
    <div className={cn("space-y-3", isSections && !isFlat && "mt-2")}>
      {label && !isSections && !isFlat && (
        <h4 className="text-base font-semibold text-foreground">{label}</h4>
      )}

      {isSections && !isFlat && (
        <div className="mb-1">
          <h4 className="text-base font-semibold text-foreground">Page sections</h4>
          <p className="text-sm text-muted">
            Expand a section to edit its content. Changes save when you click Save.
          </p>
        </div>
      )}

      {isFlat && value.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface-subtle px-4 py-4 text-center text-sm text-muted">
          No items yet. Click + Add {itemLabelSingular} below.
        </p>
      )}

      {value.map((item, index) => {
        const itemLabel = getArrayItemLabel(item, index, fieldKey);
        const isObjectItem = typeof item === "object" && item !== null && !Array.isArray(item);
        const template = isObjectItem ? String((item as Record<string, unknown>)._template ?? "") : "";

        const editor = (
          <VisualValueEditor
            fieldKey={`${fieldKey}[${index}]`}
            // Flat mode already renders this item's label + Remove below —
            // suppress the nested object editor's own duplicate heading.
            label={isFlat && isObjectItem ? "" : undefined}
            value={item}
            templateOptions={templateOptions}
            onChange={(next) => {
              const copy = [...value];
              copy[index] = next;
              onChange(copy);
            }}
            depth={depth + 1}
            variant={variant}
            projectId={projectId}
            blockFields={itemFields}
          />
        );

        const removeItem = () => onChange(value.filter((_, i) => i !== index));

        if (isFlat) {
          return (
            <div key={`${fieldKey}-${index}`} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{itemLabel}</p>
                <button
                  type="button"
                  onClick={removeItem}
                  className="text-xs text-muted transition-colors hover:text-destructive"
                >
                  Remove
                </button>
              </div>
              {editor}
            </div>
          );
        }

        return (
          <CollapsibleCard
            key={`${fieldKey}-${index}`}
            title={itemLabel}
            badge={template ? humanizeFieldKey(template) : undefined}
            defaultOpen={index === 0}
          >
            {editor}
          </CollapsibleCard>
        );
      })}

      {(isFlat || itemFields?.length) && (
        <button
          type="button"
          onClick={addItem}
          className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-thunder-400 hover:text-thunder-600"
        >
          + Add {itemLabelSingular}
        </button>
      )}
    </div>
  );
}

/** Best-effort template for a new item in a schema-less array — clones the shape
 * of an existing item with blanked-out values (used when no `itemFields` exist). */
function blankClone(items: unknown[]): Record<string, unknown> {
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

/** Seed an object from a list of field definitions (used when adding array items). */
function buildFromFields(fields: BlockFieldDef[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.default !== undefined) obj[f.name] = f.default;
    else if (f.type === "boolean") obj[f.name] = false;
    else if (f.type === "number") obj[f.name] = 0;
    else if (f.type === "tags" || f.type === "array") obj[f.name] = [];
    else if (f.type === "object") obj[f.name] = f.fields ? buildFromFields(f.fields) : {};
    else obj[f.name] = "";
  }
  return obj;
}