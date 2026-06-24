"use client";

import { resolveImageUrl } from "@/lib/content/field-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const resolvedUrl = resolveImageUrl(value, projectId);
  const fieldSpacing = variant === "flat" ? "space-y-1.5" : "space-y-2";

  return (
    <div className={fieldSpacing}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="space-y-2">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/photo.jpg or https://..."
        />
        {resolvedUrl && (
          <div className="relative max-w-xs overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50 p-1.5 shadow-sm">
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
    </div>
  );
}