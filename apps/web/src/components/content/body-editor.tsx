"use client";

import { FileText } from "lucide-react";
import { useMemo } from "react";
import { MDXMarkdownEditor } from "@/components/content/mdx-markdown-editor";
import { cn } from "@/lib/utils";

interface BodyEditorProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  mode: "visual" | "markdown";
  onModeChange: (mode: "visual" | "markdown") => void;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function BodyEditor({ projectId, value, onChange, mode, onModeChange }: BodyEditorProps) {
  const stats = useMemo(() => {
    const words = countWords(value);
    const chars = value.length;
    return { words, chars };
  }, [value]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-thunder-100 text-thunder-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Content</p>
            <p className="text-xs text-muted">
              {stats.words} {stats.words === 1 ? "word" : "words"} · {stats.chars} characters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("visual")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "visual" ? "bg-thunder-600 text-white shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => onModeChange("markdown")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "markdown"
                ? "bg-thunder-600 text-white shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            Raw Markdown
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-surface-raised">
        <MDXMarkdownEditor
          projectId={projectId}
          mode={mode}
          markdown={value}
          onChange={onChange}
          placeholder="Start writing your content..."
        />
      </div>
    </div>
  );
}