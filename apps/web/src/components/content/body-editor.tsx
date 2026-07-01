"use client";

import { FileText, PenLine } from "lucide-react";
import { useMemo } from "react";
import { NotionEditor } from "@/components/content/notion-editor";
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
      <div className="flex items-center justify-between border-b border-border/60 bg-surface-raised/80 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-thunder-50 text-thunder-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Content</p>
            <p className="text-xs text-muted">
              {stats.words} {stats.words === 1 ? "word" : "words"} · {stats.chars} characters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-subtle p-1">
          <button
            type="button"
            onClick={() => onModeChange("visual")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              mode === "visual"
                ? "bg-surface-raised text-foreground shadow-xs"
                : "text-muted hover:text-foreground",
            )}
          >
            <PenLine className="h-3.5 w-3.5" />
            Write
          </button>
          <button
            type="button"
            onClick={() => onModeChange("markdown")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              mode === "markdown"
                ? "bg-surface-raised text-foreground shadow-xs"
                : "text-muted hover:text-foreground",
            )}
          >
            Markdown
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <NotionEditor
          projectId={projectId}
          mode={mode}
          markdown={value}
          onChange={onChange}
          placeholder="Start writing, or type '/' for blocks…"
        />
      </div>
    </div>
  );
}