"use client";

import {
  CheckSquare,
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ImageIcon,
  Link2,
  List,
  ListOrdered,
  MessageSquare,
  Minus,
  Quote,
  Table,
  Type,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface BlockMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}

export interface BlockMenuGroup {
  label: string;
  items: BlockMenuItem[];
}

export const BLOCK_MENU_GROUPS: BlockMenuGroup[] = [
  {
    label: "Basic blocks",
    items: [
      { id: "p", label: "Text", shortcut: "p", icon: <Type className="h-4 w-4" /> },
      { id: "h1", label: "Heading 1", shortcut: "#", icon: <Heading1 className="h-4 w-4" /> },
      { id: "h2", label: "Heading 2", shortcut: "##", icon: <Heading2 className="h-4 w-4" /> },
      { id: "h3", label: "Heading 3", shortcut: "###", icon: <Heading3 className="h-4 w-4" /> },
      { id: "h4", label: "Heading 4", shortcut: "####", icon: <Heading4 className="h-4 w-4" /> },
    ],
  },
  {
    label: "Lists",
    items: [
      { id: "ul", label: "Bulleted list", shortcut: "-", icon: <List className="h-4 w-4" /> },
      { id: "ol", label: "Numbered list", shortcut: "1.", icon: <ListOrdered className="h-4 w-4" /> },
      { id: "todo", label: "To-do list", shortcut: "[]", icon: <CheckSquare className="h-4 w-4" /> },
      { id: "toggle", label: "Toggle list", shortcut: ">", icon: <ChevronRight className="h-4 w-4" /> },
    ],
  },
  {
    label: "Media",
    items: [
      { id: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
      { id: "link", label: "Link", shortcut: "link", icon: <Link2 className="h-4 w-4" /> },
    ],
  },
  {
    label: "Advanced",
    items: [
      { id: "quote", label: "Quote", shortcut: '"', icon: <Quote className="h-4 w-4" /> },
      { id: "callout", label: "Callout", shortcut: "!", icon: <MessageSquare className="h-4 w-4" /> },
      { id: "code", label: "Code block", shortcut: "```", icon: <Code2 className="h-4 w-4" /> },
      { id: "table", label: "Table", shortcut: "table", icon: <Table className="h-4 w-4" /> },
      { id: "hr", label: "Divider", shortcut: "---", icon: <Minus className="h-4 w-4" /> },
    ],
  },
];

export const BLOCK_MENU_ITEMS: BlockMenuItem[] = BLOCK_MENU_GROUPS.flatMap((g) => g.items);

export interface BlockMenuAnchor {
  top: number;
  bottom: number;
  left: number;
}

const MENU_GAP = 8;
const VIEWPORT_PADDING = 12;
const MENU_WIDTH = 300;

function filterItems(filter: string): BlockMenuItem[] {
  const q = filter.trim().toLowerCase();
  if (!q) return BLOCK_MENU_ITEMS;
  return BLOCK_MENU_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.includes(q) ||
      item.shortcut?.includes(q),
  );
}

function computeMenuCoords(
  anchor: BlockMenuAnchor,
  menuHeight: number,
  preferBelow: boolean,
): { top: number; left: number; placement: "above" | "below" } {
  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PADDING;
  const spaceAbove = anchor.top - VIEWPORT_PADDING;

  let placement: "above" | "below" = preferBelow ? "below" : "above";

  if (placement === "below" && menuHeight + MENU_GAP > spaceBelow && spaceAbove > spaceBelow) {
    placement = "above";
  } else if (placement === "above" && menuHeight + MENU_GAP > spaceAbove && spaceBelow > spaceAbove) {
    placement = "below";
  }

  let top =
    placement === "below"
      ? anchor.bottom + MENU_GAP
      : anchor.top - menuHeight - MENU_GAP;

  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING),
  );

  const left = Math.max(
    VIEWPORT_PADDING,
    Math.min(anchor.left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
  );

  return { top, left, placement };
}

interface BlockMenuProps {
  open: boolean;
  anchor: BlockMenuAnchor | null;
  filter: string;
  activeIndex: number;
  autoFocusSearch?: boolean;
  showSearch?: boolean;
  onFilterChange: (value: string) => void;
  onSelect: (item: BlockMenuItem) => void;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function BlockMenu({
  open,
  anchor,
  filter,
  activeIndex,
  autoFocusSearch = false,
  showSearch = true,
  onFilterChange,
  onSelect,
  onClose,
  onIndexChange,
}: BlockMenuProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "above" | "below" } | null>(
    null,
  );

  const filtered = useMemo(() => filterItems(filter), [filter]);
  const isFiltering = filter.trim().length > 0;

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) {
      setCoords(null);
      return;
    }
    const menuHeight = menuRef.current.offsetHeight;
    setCoords(computeMenuCoords(anchor, menuHeight, !autoFocusSearch));
  }, [open, anchor, autoFocusSearch, filtered.length, showSearch]);

  useEffect(() => {
    if (open && autoFocusSearch) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, autoFocusSearch]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filtered.length]);

  if (!open || !anchor) return null;

  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  const renderItem = (item: BlockMenuItem, i: number) => (
    <button
      key={item.id}
      type="button"
      data-active={i === safeIndex}
      onClick={() => onSelect(item)}
      onMouseEnter={() => onIndexChange(i)}
      className={cn("notion-block-menu-item", i === safeIndex && "notion-block-menu-item-active")}
    >
      <span className="notion-block-menu-icon">{item.icon}</span>
      <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
      {item.shortcut && (
        <span className="notion-block-menu-shortcut">{item.shortcut}</span>
      )}
    </button>
  );

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        "notion-block-menu",
        coords?.placement === "above" && "notion-block-menu-above",
        !coords && "notion-block-menu-measuring",
      )}
      style={{
        top: coords?.top ?? anchor.bottom + MENU_GAP,
        left: coords?.left ?? anchor.left,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {showSearch && (
        <div className="notion-block-menu-search">
          <input
            ref={searchRef}
            type="text"
            value={filter}
            onChange={(e) => {
              onFilterChange(e.target.value);
              onIndexChange(0);
            }}
            placeholder="Search blocks…"
            className="notion-block-menu-search-input"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                onIndexChange(Math.min(safeIndex + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                onIndexChange(Math.max(safeIndex - 1, 0));
              } else if (e.key === "Enter" && filtered[safeIndex]) {
                e.preventDefault();
                onSelect(filtered[safeIndex]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
        </div>
      )}

      <div ref={listRef} className="notion-block-menu-list">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted">No blocks found</p>
        ) : isFiltering ? (
          filtered.map((item, i) => renderItem(item, i))
        ) : (
          BLOCK_MENU_GROUPS.map((group) => (
            <div key={group.label} className="notion-block-menu-group">
              <p className="notion-block-menu-group-label">{group.label}</p>
              {group.items.map((item) => {
                const i = BLOCK_MENU_ITEMS.indexOf(item);
                return renderItem(item, i);
              })}
            </div>
          ))
        )}
      </div>

      <div className="notion-block-menu-footer">
        <span className="text-xs text-muted">↑↓ navigate · ↵ select</span>
        <span className="notion-block-menu-kbd">esc</span>
      </div>
    </div>,
    document.body,
  );
}