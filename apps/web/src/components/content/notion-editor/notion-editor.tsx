"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown/convert";
import { BlockMenu, BLOCK_MENU_ITEMS, type BlockMenuItem } from "./block-menu";
import { EditorToolbar } from "./editor-toolbar";
import { ImageInsertDialog, type ImageInsertResult } from "./image-insert-dialog";
import { ShortcodeDialog } from "./shortcode-dialog";
import { SlashHint } from "./slash-hint";
import { TableInsertDialog } from "./table-insert-dialog";
import { TableToolbar } from "./table-toolbar";
import {
  addTableColumnLeft,
  addTableColumnRight,
  addTableRowAbove,
  addTableRowBelow,
  buildTableMarkdown,
  insertTableAtSelection,
  canDeleteTableColumn,
  canDeleteTableRow,
  deleteTableColumn,
  deleteTableRow,
  getTableContext,
  type TableContext,
} from "./table-utils";

type EditorMode = "visual" | "markdown";

interface NotionEditorProps {
  projectId: string;
  mode: EditorMode;
  markdown: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface SlashState {
  anchorTop: number;
  anchorBottom: number;
  anchorLeft: number;
  hintTop: number;
  hintLeft: number;
  filter: string;
  index: number;
  fromToolbar?: boolean;
}

function buildSlashState(
  rect: DOMRect,
  opts: { filter?: string; index?: number; fromToolbar?: boolean },
): SlashState {
  return {
    anchorTop: rect.top,
    anchorBottom: rect.bottom,
    anchorLeft: rect.left,
    hintTop: rect.top,
    hintLeft: rect.left,
    filter: opts.filter ?? "",
    index: opts.index ?? 0,
    fromToolbar: opts.fromToolbar ?? false,
  };
}

function getMarkdownSnippet(item: BlockMenuItem): string {
  switch (item.id) {
    case "p":
      return "\n\n";
    case "h1":
      return "\n\n# ";
    case "h2":
      return "\n\n## ";
    case "h3":
      return "\n\n### ";
    case "h4":
      return "\n\n#### ";
    case "ul":
      return "\n\n- ";
    case "ol":
      return "\n\n1. ";
    case "todo":
      return "\n\n- [ ] ";
    case "toggle":
      return "\n\n> ";
    case "quote":
      return "\n\n> ";
    case "hr":
      return "\n\n---\n\n";
    case "image":
      return "\n\n![image](path)\n\n";
    case "link":
      return "\n\n[link text](url)\n\n";
    case "code":
      return "\n\n```\n\n```\n\n";
    case "callout":
      return "\n\n> **Note:** \n\n";
    case "table":
      return "\n\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n\n";
    default:
      return "\n\n";
  }
}

function getCaretRectFromTextarea(el: HTMLTextAreaElement): DOMRect {
  const { selectionStart } = el;
  const style = window.getComputedStyle(el);
  const div = document.createElement("div");
  const properties = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "paddingTop",
    "paddingLeft",
    "paddingRight",
    "borderTopWidth",
    "borderLeftWidth",
    "boxSizing",
    "width",
  ] as const;

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "hidden";

  for (const prop of properties) {
    div.style[prop] = style[prop];
  }

  const text = el.value.substring(0, selectionStart);
  div.textContent = text;
  const span = document.createElement("span");
  span.textContent = el.value.substring(selectionStart) || ".";
  div.appendChild(span);

  document.body.appendChild(div);
  const rect = span.getBoundingClientRect();
  const textareaRect = el.getBoundingClientRect();
  document.body.removeChild(div);

  return new DOMRect(
    textareaRect.left + rect.left - el.scrollLeft,
    textareaRect.top + rect.top - el.scrollTop,
    rect.width,
    rect.height,
  );
}

function getSlashMatchBeforeCursor(text: string, offset: number): string | null {
  const before = text.slice(0, offset);
  const match = before.match(/\/([^\n]*)$/);
  return match ? match[1] : null;
}

function isInsideBlockMenu(node: Node | null): boolean {
  if (!node) return false;
  const el = node instanceof Element ? node : node.parentElement;
  return !!el?.closest(".notion-block-menu");
}

function isInsideTableToolbar(node: Node | null): boolean {
  if (!node) return false;
  const el = node instanceof Element ? node : node.parentElement;
  return !!el?.closest(".notion-table-toolbar");
}

export function NotionEditor({
  projectId,
  mode,
  markdown,
  onChange,
  placeholder = "Write, press '/' for commands…",
}: NotionEditorProps) {
  if (mode === "markdown") {
    return (
      <MarkdownSurface
        value={markdown}
        onChange={onChange}
        placeholder={placeholder}
        projectId={projectId}
      />
    );
  }

  return (
    <VisualSurface
      value={markdown}
      onChange={onChange}
      placeholder={placeholder}
      projectId={projectId}
    />
  );
}

function MarkdownSurface({
  value,
  onChange,
  placeholder,
  projectId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  projectId: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [tableInsertOpen, setTableInsertOpen] = useState(false);
  const [shortcodeOpen, setShortcodeOpen] = useState(false);
  const [slash, setSlash] = useState<SlashState | null>(null);

  function insertAtCursor(snippet: string, replaceSlash = false) {
    const el = textareaRef.current;
    if (!el) return;
    let start = el.selectionStart;
    let end = el.selectionEnd;
    let text = value;

    if (replaceSlash) {
      const before = text.slice(0, start);
      const slashMatch = before.match(/(.*)\/([^\n]*)$/);
      if (slashMatch) {
        const slashStart = before.length - (slashMatch[2]?.length ?? 0) - 1;
        text = text.slice(0, slashStart) + text.slice(start);
        start = slashStart;
        end = slashStart;
      }
    }

    const next = text.slice(0, start) + snippet + text.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function openSlashMenu(fromToolbar = false) {
    const el = textareaRef.current;
    if (!el) return;
    const rect = fromToolbar
      ? el.getBoundingClientRect()
      : getCaretRectFromTextarea(el);
    setSlash(buildSlashState(rect, { fromToolbar }));
  }

  function handleBlockSelect(item: BlockMenuItem) {
    if (item.id === "image") {
      setSlash(null);
      setImageOpen(true);
      return;
    }
    if (item.id === "link") {
      setSlash(null);
      const url = window.prompt("Link URL");
      if (url) insertAtCursor(`[link text](${url})`, !slash?.fromToolbar);
      return;
    }
    if (item.id === "table") {
      setSlash(null);
      setTableInsertOpen(true);
      return;
    }
    insertAtCursor(getMarkdownSnippet(item), !slash?.fromToolbar);
    setSlash(null);
  }

  function handleTableInsert(columns: number, rows: number) {
    insertAtCursor(buildTableMarkdown(columns, rows), false);
  }

  function wrapSelection(prefix: string, suffix = prefix) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    insertAtCursor(`${prefix}${selected || "text"}${suffix}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "/" && !slash) {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const rect = getCaretRectFromTextarea(el);
        setSlash(buildSlashState(rect, {}));
      });
    }

    if (slash) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlash((s) =>
          s ? { ...s, index: Math.min(s.index + 1, BLOCK_MENU_ITEMS.length - 1) } : s,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlash((s) => (s ? { ...s, index: Math.max(s.index - 1, 0) } : s));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const filtered = filterBlocks(slash.filter);
        const item = filtered[slash.index];
        if (item) handleBlockSelect(item);
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      wrapSelection("**");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      wrapSelection("*");
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el || !slash) return;
    const match = getSlashMatchBeforeCursor(el.value, el.selectionStart);
    if (match === null) {
      setSlash(null);
      return;
    }
    const el2 = textareaRef.current;
    const caretRect = el2 ? getCaretRectFromTextarea(el2) : null;
    setSlash((s) =>
      s && caretRect
        ? {
            ...s,
            filter: match,
            index: 0,
            anchorTop: caretRect.top,
            anchorBottom: caretRect.bottom,
            anchorLeft: caretRect.left,
            hintTop: caretRect.top,
            hintLeft: caretRect.left,
          }
        : s,
    );
  }

  function handleImageInsert(result: ImageInsertResult) {
    const alt = result.alt || "image";
    insertAtCursor(`\n\n![${alt}](${result.src})\n\n`, false);
  }

  const showSlashHint = !!slash && !slash.fromToolbar && slash.filter === "";

  return (
    <div className="notion-editor-shell">
      <EditorToolbar
        onBold={() => wrapSelection("**")}
        onItalic={() => wrapSelection("*")}
        onStrike={() => wrapSelection("~~")}
        onCode={() => wrapSelection("`")}
        onLink={() => wrapSelection("[", "](url)")}
        onHeading={(n) => insertAtCursor("\n\n" + "#".repeat(n) + " ")}
        onBulletList={() => insertAtCursor("\n\n- ")}
        onNumberedList={() => insertAtCursor("\n\n1. ")}
        onQuote={() => insertAtCursor("\n\n> ")}
        onImage={() => setImageOpen(true)}
        onOpenBlocks={() => openSlashMenu(true)}
        onComponent={() => setShortcodeOpen(true)}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        spellCheck
        className="notion-markdown-input"
      />
      <SlashHint
        visible={showSlashHint}
        position={slash ? { top: slash.hintTop, left: slash.hintLeft } : null}
      />
      <BlockMenu
        open={!!slash}
        anchor={
          slash
            ? { top: slash.anchorTop, bottom: slash.anchorBottom, left: slash.anchorLeft }
            : null
        }
        filter={slash?.filter ?? ""}
        activeIndex={slash?.index ?? 0}
        autoFocusSearch={slash?.fromToolbar}
        showSearch={!!slash?.fromToolbar}
        onFilterChange={(v) => setSlash((s) => (s ? { ...s, filter: v, index: 0 } : s))}
        onSelect={handleBlockSelect}
        onClose={() => setSlash(null)}
        onIndexChange={(i) => setSlash((s) => (s ? { ...s, index: i } : s))}
      />
      <ImageInsertDialog
        open={imageOpen}
        projectId={projectId}
        onClose={() => setImageOpen(false)}
        onInsert={handleImageInsert}
      />
      <TableInsertDialog
        open={tableInsertOpen}
        onClose={() => setTableInsertOpen(false)}
        onInsert={handleTableInsert}
      />
      <ShortcodeDialog
        open={shortcodeOpen}
        onClose={() => setShortcodeOpen(false)}
        onInsert={(mdx) => insertAtCursor(mdx, false)}
      />
    </div>
  );
}

function filterBlocks(filter: string) {
  const q = filter.trim().toLowerCase();
  if (!q) return BLOCK_MENU_ITEMS;
  return BLOCK_MENU_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.includes(q) ||
      item.shortcut?.includes(q),
  );
}

function VisualSurface({
  value,
  onChange,
  placeholder,
  projectId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  projectId: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastMarkdown = useRef(value);
  const isFocused = useRef(false);
  const tableContextRef = useRef<TableContext | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [tableInsertOpen, setTableInsertOpen] = useState(false);
  const [tableToolbar, setTableToolbar] = useState<{
    top: number;
    left: number;
    width: number;
    canDeleteRow: boolean;
    canDeleteColumn: boolean;
  } | null>(null);

  const syncFromHtml = useCallback(() => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    lastMarkdown.current = md;
    onChange(md);
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = markdownToHtml(value);
    lastMarkdown.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorRef.current || isFocused.current || slash) return;
    if (value !== lastMarkdown.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastMarkdown.current = value;
    }
  }, [value, slash]);

  const updateTableToolbar = useCallback(() => {
    const sel = window.getSelection();
    const ctx = getTableContext(sel?.anchorNode ?? null);
    if (!ctx || !editorRef.current?.contains(ctx.table)) {
      tableContextRef.current = null;
      setTableToolbar(null);
      return;
    }

    tableContextRef.current = ctx;
    const rect = ctx.table.getBoundingClientRect();
    setTableToolbar({
      top: Math.max(12, rect.top - 44),
      left: rect.left,
      width: rect.width,
      canDeleteRow: canDeleteTableRow(ctx),
      canDeleteColumn: canDeleteTableColumn(ctx),
    });
  }, []);

  useEffect(() => {
    const shell = editorRef.current?.closest(".notion-editor-scroll");
    const onScroll = () => updateTableToolbar();
    shell?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      shell?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateTableToolbar]);

  function runTableAction(action: (ctx: TableContext) => void) {
    const ctx = tableContextRef.current;
    if (!ctx) return;
    action(ctx);
    syncFromHtml();
    updateTableToolbar();
    editorRef.current?.focus();
  }

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncFromHtml();
  }

  function applyBlock(tag: string) {
    document.execCommand("formatBlock", false, tag);
    editorRef.current?.focus();
    syncFromHtml();
  }

  function removeSlashCharacter() {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
      const text = node.textContent ?? "";
      const before = text.slice(0, range.startOffset);
      const slashIdx = before.lastIndexOf("/");
      if (slashIdx >= 0) {
        range.setStart(node, slashIdx);
        range.deleteContents();
      }
    }
  }

  function applyBlockItem(item: BlockMenuItem) {
    if (!slash?.fromToolbar) removeSlashCharacter();

    if (item.id === "image") {
      setSlash(null);
      setImageOpen(true);
      return;
    }
    if (item.id === "link") {
      setSlash(null);
      const url = window.prompt("Link URL");
      if (url) exec("createLink", url);
      else editorRef.current?.focus();
      return;
    }
    if (item.id === "hr") {
      document.execCommand("insertHorizontalRule");
    } else if (item.id === "code") {
      document.execCommand(
        "insertHTML",
        false,
        '<pre class="notion-code-block"><code><br></code></pre>',
      );
    } else if (item.id === "callout") {
      document.execCommand(
        "insertHTML",
        false,
        '<blockquote class="notion-callout"><p><br></p></blockquote>',
      );
    } else if (item.id === "table") {
      setSlash(null);
      setTableInsertOpen(true);
      return;
    } else if (item.id === "ul" || item.id === "todo") {
      document.execCommand("insertUnorderedList");
    } else if (item.id === "ol") {
      document.execCommand("insertOrderedList");
    } else if (item.id === "quote" || item.id === "toggle") {
      document.execCommand("formatBlock", false, "blockquote");
    } else if (item.id === "p") {
      document.execCommand("formatBlock", false, "p");
    } else {
      applyBlock(item.id);
    }
    syncFromHtml();
    setSlash(null);
    editorRef.current?.focus();
  }

  function openSlashAtCaret(fromToolbar = false) {
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!editor) return;

    let rect: DOMRect;
    if (fromToolbar || !sel?.rangeCount) {
      rect = editor.getBoundingClientRect();
    } else {
      rect = sel.getRangeAt(0).getBoundingClientRect();
    }

    setSlash(buildSlashState(rect, { fromToolbar }));
  }

  function getTextBeforeCursor(range: Range): string {
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").slice(0, range.startOffset);
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const offset = range.startOffset;
      let text = "";
      for (let i = 0; i < offset && i < el.childNodes.length; i++) {
        text += el.childNodes[i].textContent ?? "";
      }
      return text;
    }
    return "";
  }

  function detectSlashInEditor() {
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!sel?.rangeCount || !editor?.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      setSlash(null);
      return;
    }

    const before = getTextBeforeCursor(range);
    const match = before.match(/\/([^\n]*)$/);

    if (match) {
      const caretRect = range.getBoundingClientRect();
      setSlash((s) =>
        buildSlashState(caretRect, {
          filter: match[1],
          index: s?.filter === match[1] ? (s?.index ?? 0) : 0,
          fromToolbar: s?.fromToolbar,
        }),
      );
    } else if (slash && !slash.fromToolbar) {
      setSlash(null);
    }
  }

  function handleEditorBlur(e: FocusEvent<HTMLDivElement>) {
    isFocused.current = false;
    const related = e.relatedTarget as Node | null;
    if (isInsideBlockMenu(related) || isInsideTableToolbar(related)) return;

    syncFromHtml();
    window.setTimeout(() => {
      const active = document.activeElement;
      if (isInsideBlockMenu(active) || isInsideTableToolbar(active)) return;
      setSlash(null);
      setTableToolbar(null);
      tableContextRef.current = null;
    }, 200);
  }

  function handleTableInsert(columns: number, rows: number) {
    if (!editorRef.current) return;
    insertTableAtSelection(editorRef.current, columns, rows);
    syncFromHtml();
    editorRef.current.focus();
    requestAnimationFrame(updateTableToolbar);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
      requestAnimationFrame(detectSlashInEditor);
    }

    if (slash) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlash((s) =>
          s ? { ...s, index: Math.min(s.index + 1, filterBlocks(s.filter).length - 1) } : s,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlash((s) => (s ? { ...s, index: Math.max(s.index - 1, 0) } : s));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const filtered = filterBlocks(slash.filter);
        const item = filtered[slash.index];
        if (item) applyBlockItem(item);
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      exec("bold");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      exec("italic");
    }
  }

  function handleImageInsert(result: ImageInsertResult) {
    const alt = result.alt || "image";
    const img = document.createElement("img");
    img.src = result.src;
    img.alt = alt;
    img.className = "notion-editor-image";

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(img);
    } else {
      editorRef.current?.appendChild(img);
    }
    syncFromHtml();
    editorRef.current?.focus();
  }

  function handleLink() {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
  }

  const showSlashHint = !!slash && !slash.fromToolbar && slash.filter === "";

  return (
    <div className="notion-editor-shell notion-editor-scroll relative flex-1 overflow-auto">
      <EditorToolbar
        onBold={() => exec("bold")}
        onItalic={() => exec("italic")}
        onStrike={() => exec("strikeThrough")}
        onCode={() => exec("insertHTML", "<code></code>")}
        onLink={handleLink}
        onHeading={(n) => applyBlock(`h${n}`)}
        onBulletList={() => exec("insertUnorderedList")}
        onNumberedList={() => exec("insertOrderedList")}
        onQuote={() => applyBlock("blockquote")}
        onImage={() => setImageOpen(true)}
        onOpenBlocks={() => openSlashAtCaret(true)}
      />

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className="notion-visual-surface"
        onFocus={() => {
          isFocused.current = true;
        }}
        onBlur={handleEditorBlur}
        onInput={() => {
          syncFromHtml();
          detectSlashInEditor();
          updateTableToolbar();
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          detectSlashInEditor();
          updateTableToolbar();
        }}
        onClick={() => {
          detectSlashInEditor();
          updateTableToolbar();
        }}
      />

      <SlashHint
        visible={showSlashHint}
        position={slash ? { top: slash.hintTop, left: slash.hintLeft } : null}
      />
      <BlockMenu
        open={!!slash}
        anchor={
          slash
            ? { top: slash.anchorTop, bottom: slash.anchorBottom, left: slash.anchorLeft }
            : null
        }
        filter={slash?.filter ?? ""}
        activeIndex={slash?.index ?? 0}
        autoFocusSearch={slash?.fromToolbar}
        showSearch={!!slash?.fromToolbar}
        onFilterChange={(v) => setSlash((s) => (s ? { ...s, filter: v, index: 0 } : s))}
        onSelect={applyBlockItem}
        onClose={() => setSlash(null)}
        onIndexChange={(i) => setSlash((s) => (s ? { ...s, index: i } : s))}
      />

      <TableToolbar
        open={!!tableToolbar}
        position={tableToolbar}
        canDeleteRow={tableToolbar?.canDeleteRow ?? false}
        canDeleteColumn={tableToolbar?.canDeleteColumn ?? false}
        onAddRowAbove={() => runTableAction(addTableRowAbove)}
        onAddRowBelow={() => runTableAction(addTableRowBelow)}
        onAddColumnLeft={() => runTableAction(addTableColumnLeft)}
        onAddColumnRight={() => runTableAction(addTableColumnRight)}
        onDeleteRow={() => runTableAction(deleteTableRow)}
        onDeleteColumn={() => runTableAction(deleteTableColumn)}
      />

      <ImageInsertDialog
        open={imageOpen}
        projectId={projectId}
        onClose={() => setImageOpen(false)}
        onInsert={handleImageInsert}
      />
      <TableInsertDialog
        open={tableInsertOpen}
        onClose={() => setTableInsertOpen(false)}
        onInsert={handleTableInsert}
      />
    </div>
  );
}