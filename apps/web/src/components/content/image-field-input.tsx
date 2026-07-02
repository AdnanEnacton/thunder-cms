"use client";

import { useState } from "react";
import { resolveImageUrl } from "@/lib/content/field-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageInsertDialog } from "@/components/content/notion-editor/image-insert-dialog";
import { ImageIcon, X } from "lucide-react";

interface ImageFieldInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  projectId?: string;
  variant?: "flat" | "default";
}

export function ImageFieldInput({
  id,
  label,
  value,
  onChange,
  projectId,
  variant = "default",
}: ImageFieldInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const resolvedUrl = resolveImageUrl(value, projectId);
  const fieldSpacing = variant === "flat" ? "space-y-1.5" : "space-y-2";

  return (
    <div className={fieldSpacing}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/images/photo.jpg or https://..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={!projectId}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-50"
            title={projectId ? "Browse media library" : "Media library unavailable"}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Browse
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised px-2 text-muted shadow-xs transition-colors hover:bg-surface-overlay hover:text-destructive"
              title="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {resolvedUrl && (
          <div className="relative max-w-xs overflow-hidden rounded-lg border border-border bg-surface-overlay p-1.5 shadow-sm">
            <img
              src={resolvedUrl}
              alt={label}
              className="max-h-36 w-full rounded-md object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {projectId && (
        <ImageInsertDialog
          open={pickerOpen}
          projectId={projectId}
          onClose={() => setPickerOpen(false)}
          onInsert={(result) => {
            onChange(result.src);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
