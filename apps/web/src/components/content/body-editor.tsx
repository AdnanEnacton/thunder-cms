"use client";

import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode: "visual" | "markdown";
  onModeChange: (mode: "visual" | "markdown") => void;
}

function wrapSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after = before,
): { value: string; cursor: number } {
  const selected = text.slice(selectionStart, selectionEnd);
  const wrapped = `${before}${selected}${after}`;
  const value = text.slice(0, selectionStart) + wrapped + text.slice(selectionEnd);
  const cursor = selectionStart + before.length + selected.length + after.length;
  return { value, cursor };
}

function prefixLines(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): { value: string; cursor: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);
  const lines = selected.split("\n").map((line) => (line ? `${prefix}${line}` : line));
  const value = before + lines.join("\n") + after;
  return { value, cursor: before.length + lines.join("\n").length };
}

export function BodyEditor({ value, onChange, mode, onModeChange }: BodyEditorProps) {
  function applyFormat(
    action: "bold" | "italic" | "h2" | "link" | "ul" | "ol" | "quote" | "code",
  ) {
    const textarea = document.getElementById("body-editor-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let result: { value: string; cursor: number };

    switch (action) {
      case "bold":
        result = wrapSelection(value, start, end, "**");
        break;
      case "italic":
        result = wrapSelection(value, start, end, "_");
        break;
      case "code":
        result = wrapSelection(value, start, end, "`");
        break;
      case "h2":
        result = prefixLines(value, start, end, "## ");
        break;
      case "ul":
        result = prefixLines(value, start, end, "- ");
        break;
      case "ol":
        result = prefixLines(value, start, end, "1. ");
        break;
      case "quote":
        result = prefixLines(value, start, end, "> ");
        break;
      case "link":
        result = wrapSelection(value, start, end, "[", "](url)");
        break;
      default:
        return;
    }

    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursor, result.cursor);
    });
  }

  const tools = [
    { icon: Heading2, label: "Heading", action: "h2" as const },
    { icon: Bold, label: "Bold", action: "bold" as const },
    { icon: Italic, label: "Italic", action: "italic" as const },
    { icon: Link, label: "Link", action: "link" as const },
    { icon: List, label: "Bullet list", action: "ul" as const },
    { icon: ListOrdered, label: "Numbered list", action: "ol" as const },
    { icon: Quote, label: "Quote", action: "quote" as const },
    { icon: Code, label: "Code", action: "code" as const },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-0.5">
          {mode === "visual" &&
            tools.map(({ icon: Icon, label, action }) => (
              <button
                key={action}
                type="button"
                title={label}
                onClick={() => applyFormat(action)}
                className="rounded p-1.5 text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange("visual")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              mode === "visual" ? "bg-surface-overlay text-foreground" : "text-muted",
            )}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => onModeChange("markdown")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              mode === "markdown" ? "bg-surface-overlay text-foreground" : "text-muted",
            )}
          >
            Raw Markdown
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <textarea
          id="body-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start writing..."
          className="h-full min-h-[320px] w-full resize-none rounded-lg border-0 bg-transparent px-1 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}