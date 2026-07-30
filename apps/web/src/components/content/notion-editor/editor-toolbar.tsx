"use client";

import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Puzzle,
  Quote,
  Strikethrough,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onStrike: () => void;
  onCode: () => void;
  onLink: () => void;
  onHeading: (level: 1 | 2 | 3) => void;
  onBulletList: () => void;
  onNumberedList: () => void;
  onQuote: () => void;
  onImage: () => void;
  onOpenBlocks: () => void;
  /** Optional — when provided, shows an "Insert MDX component" button. */
  onComponent?: () => void;
  className?: string;
}

export function EditorToolbar({
  onBold,
  onItalic,
  onStrike,
  onCode,
  onLink,
  onHeading,
  onBulletList,
  onNumberedList,
  onQuote,
  onImage,
  onOpenBlocks,
  onComponent,
  className,
}: EditorToolbarProps) {
  return (
    <div className={cn("notion-editor-toolbar", className)}>
      <div className="notion-editor-toolbar-group">
        <ToolbarButton title="Bold (⌘B)" onClick={onBold}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic (⌘I)" onClick={onItalic}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" onClick={onStrike}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Inline code" onClick={onCode}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={onLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <span className="notion-editor-toolbar-divider" />

      <div className="notion-editor-toolbar-group">
        <ToolbarButton title="Heading 1" onClick={() => onHeading(1)}>
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Heading 2" onClick={() => onHeading(2)}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Heading 3" onClick={() => onHeading(3)}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={onBulletList}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={onNumberedList}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Quote" onClick={onQuote}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Insert image" onClick={onImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <span className="notion-editor-toolbar-divider" />

      <button
        type="button"
        onClick={onOpenBlocks}
        className="notion-editor-blocks-btn"
        title="Insert block (type / in editor)"
      >
        <Plus className="h-4 w-4" />
        <span>Blocks</span>
      </button>

      {onComponent && (
        <button
          type="button"
          onClick={onComponent}
          className="notion-editor-blocks-btn"
          title="Insert MDX component"
        >
          <Puzzle className="h-4 w-4" />
          <span>Component</span>
        </button>
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button type="button" title={title} onClick={onClick} className="notion-editor-toolbar-btn">
      {children}
    </button>
  );
}