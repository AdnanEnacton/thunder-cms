"use client";

import { ItemList } from "@/components/content/item-list";
import {
  collectTemplateOptions,
  getArrayItemLabel,
  humanizeFieldKey,
  inferControlKind,
  isListArrayField,
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
}

export function VisualValueEditor({
  label,
  fieldKey = "root",
  value,
  onChange,
  depth = 0,
  templateOptions,
  variant = "default",
}: VisualValueEditorProps) {
  const control = inferControlKind(fieldKey, value);
  const id = `field-${fieldKey}-${depth}`;

  if (value === null || value === undefined) {
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
        value={value as Record<string, unknown>}
        onChange={onChange}
        depth={depth}
        templateOptions={templateOptions}
        variant={variant}
      />
    );
  }

  if (control === "array") {
    return (
      <ArrayEditor
        label={label}
        fieldKey={fieldKey}
        value={value as unknown[]}
        onChange={onChange}
        depth={depth}
        variant={variant}
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
    const options = (templateOptions?.length
      ? templateOptions
      : typeof value === "string"
        ? [value]
        : []
    ).map((option) => ({
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
          options={options}
        />
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

  if (control === "textarea") {
    return (
      <div className={variant === "flat" ? "space-y-1.5" : "space-y-2"}>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label ?? humanizeFieldKey(fieldKey)}
        </Label>
        <textarea
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={variant === "flat" ? 3 : 4}
          className={
            variant === "flat"
              ? "flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-thunder-500 focus:outline-none focus:ring-1 focus:ring-thunder-500/20"
              : "flex w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm shadow-sm focus:border-thunder-500 focus:outline-none focus:ring-2 focus:ring-thunder-500/20"
          }
        />
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
    </div>
  );
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
}: {
  label?: string;
  fieldKey: string;
  value: Record<string, unknown>;
  onChange: (value: unknown) => void;
  depth: number;
  templateOptions?: string[];
  variant: EditorVariant;
}) {
  const keys = sortObjectKeys(Object.keys(value));
  const isNestedGroup = depth > 0;
  const groupLabel = label ?? humanizeFieldKey(fieldKey);
  const isFlat = variant === "flat";
  const fieldSpacing = isFlat ? "space-y-4" : "space-y-4";

  const fields = (
    <div className={fieldSpacing}>
      {keys.map((key) => (
        <VisualValueEditor
          key={key}
          fieldKey={key}
          label={humanizeFieldKey(key)}
          value={value[key]}
          templateOptions={
            key === "_template" || key === "template" ? templateOptions : undefined
          }
          onChange={(next) => onChange({ ...value, [key]: next })}
          depth={depth + 1}
          variant={variant}
        />
      ))}
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
        <p className="text-sm font-medium text-foreground">{groupLabel}</p>
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
}: {
  label?: string;
  fieldKey: string;
  value: unknown[];
  onChange: (value: unknown) => void;
  depth: number;
  variant: EditorVariant;
}) {
  const templateOptions = fieldKey === "sections" ? collectTemplateOptions(value) : undefined;
  const isSections = fieldKey === "sections";
  const isFlat = variant === "flat";
  const useItemList = isFlat && !isSections && isListArrayField(fieldKey, value);

  if (useItemList) {
    return (
      <ItemList
        fieldKey={fieldKey}
        items={value}
        onChange={onChange}
        templateOptions={templateOptions}
      />
    );
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

      {value.map((item, index) => {
        const itemLabel = getArrayItemLabel(item, index, fieldKey);
        const template =
          typeof item === "object" && item !== null && !Array.isArray(item)
            ? String((item as Record<string, unknown>)._template ?? "")
            : "";

        const editor = (
          <VisualValueEditor
            fieldKey={`${fieldKey}[${index}]`}
            value={item}
            templateOptions={templateOptions}
            onChange={(next) => {
              const copy = [...value];
              copy[index] = next;
              onChange(copy);
            }}
            depth={depth + 1}
            variant={variant}
          />
        );

        if (isFlat) {
          return (
            <div key={`${fieldKey}-${index}`} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{itemLabel}</p>
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
    </div>
  );
}