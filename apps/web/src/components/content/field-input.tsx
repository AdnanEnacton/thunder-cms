"use client";

import type { FieldSchema, FieldType } from "@thunder/types";
import { VisualValueEditor } from "@/components/content/visual-value-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface FieldInputProps {
  field: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}

function resolveFieldType(field: FieldSchema, value: unknown): FieldType {
  if (field.type !== "string" && field.type !== "unknown") return field.type;
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((item) => typeof item === "string")) return "tags";
    return "json";
  }
  if (typeof value === "object" && value !== null) return "json";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    if (value.length > 120) return "text";
  }
  return field.type === "unknown" ? "string" : field.type;
}

export function FieldInput({ field, value, onChange, compact = false }: FieldInputProps) {
  const id = `field-${field.name}`;
  const fieldType = resolveFieldType(field, value);

  if (fieldType === "json") {
    return (
      <VisualValueEditor
        label={field.label}
        fieldKey={field.name}
        value={value}
        onChange={onChange}
        variant={compact ? "flat" : "default"}
      />
    );
  }

  if (fieldType === "boolean") {
    if (compact) {
      return (
        <div className="flex items-center justify-between gap-4 py-1">
          <Label htmlFor={id} className="text-sm font-medium text-foreground">
            {field.label}
          </Label>
          <Switch id={id} checked={Boolean(value)} onChange={onChange} />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-sm">
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
        </Label>
        <Switch id={id} checked={Boolean(value)} onChange={onChange} />
      </div>
    );
  }

  const fieldSpacing = compact ? "space-y-1.5" : "space-y-2";
  const textareaClass = compact
    ? "flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-thunder-500 focus:outline-none focus:ring-1 focus:ring-thunder-500/20"
    : "flex w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm shadow-sm focus:border-thunder-500 focus:outline-none focus:ring-2 focus:ring-thunder-500/20";

  if (fieldType === "tags") {
    const tags = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return (
      <div className={fieldSpacing}>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {field.label}
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

  if (fieldType === "text") {
    return (
      <div className={fieldSpacing}>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {field.label}
        </Label>
        <textarea
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={compact ? 2 : 3}
          className={textareaClass}
        />
      </div>
    );
  }

  const inputType =
    fieldType === "number"
      ? "number"
      : fieldType === "date"
        ? "date"
        : fieldType === "image"
          ? "url"
          : "text";

  return (
    <div className={fieldSpacing}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {field.label}
      </Label>
      <Input
        id={id}
        type={inputType}
        value={String(value ?? "")}
        onChange={(e) => {
          if (fieldType === "number") {
            onChange(e.target.value === "" ? "" : Number(e.target.value));
          } else {
            onChange(e.target.value);
          }
        }}
      />
    </div>
  );
}