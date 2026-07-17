"use client";

import { useRef } from "react";
import { Bold, Link2, List } from "lucide-react";
import { Label } from "@/components/ui/label";

interface RichTextFieldInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  variant?: "default" | "flat";
  help?: string;
}

export function RichTextFieldInput({
  id,
  label,
  value,
  onChange,
  variant = "default",
  help,
}: RichTextFieldInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyWrap(mark: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || "text";
    const next = value.slice(0, start) + mark + selected + mark + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + mark.length, start + mark.length + selected.length);
    });
  }

  function applyLink() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || "link text";
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    const inserted = `[${selected}](${url})`;
    const next = value.slice(0, start) + inserted + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + inserted.length, start + inserted.length);
    });
  }

  function applyBulletList() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    // Expand to full lines so a multi-line selection gets "- " on every line.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextBreak = value.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const block = value.slice(lineStart, lineEnd);
    const bulleted = block
      .split("\n")
      .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
      .join("\n");
    const next = value.slice(0, lineStart) + bulleted + value.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + bulleted.length);
    });
  }

  return (
    <div className={variant === "flat" ? "space-y-1.5" : "space-y-2"}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="overflow-hidden rounded-[10px] border border-border bg-surface-raised focus-within:border-thunder-500 focus-within:ring-2 focus-within:ring-thunder-500/20">
        <div className="flex items-center gap-0.5 border-b border-border bg-surface-subtle px-1.5 py-1">
          <ToolbarButton title="Bold" onClick={() => applyWrap("**")}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Link" onClick={applyLink}>
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Bulleted list" onClick={applyBulletList}>
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={variant === "flat" ? 5 : 6}
          className="flex min-h-[110px] w-full resize-y border-0 bg-transparent px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none"
        />
      </div>
      <p className="text-xs text-muted">
        Markdown — <code className="font-mono">**bold**</code>,{" "}
        <code className="font-mono">[text](url)</code>, and{" "}
        <code className="font-mono">- </code> bullet lists.
      </p>
      {help && <p className="text-xs text-muted">{help}</p>}
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      // Keep the textarea's current selection intact — a normal click would
      // blur it (clearing selectionStart/End) before onClick can read them.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-overlay hover:text-foreground"
    >
      {children}
    </button>
  );
}
