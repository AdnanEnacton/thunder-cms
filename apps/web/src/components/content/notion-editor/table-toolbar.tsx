"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Columns3, Rows3, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  open: boolean;
  position: { top: number; left: number; width: number } | null;
  canDeleteRow: boolean;
  canDeleteColumn: boolean;
  onAddRowAbove: () => void;
  onAddRowBelow: () => void;
  onAddColumnLeft: () => void;
  onAddColumnRight: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
}

function ToolbarButton({
  label,
  onClick,
  icon,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      className={cn(
        "notion-table-toolbar-btn",
        danger && "notion-table-toolbar-btn-danger",
        disabled && "notion-table-toolbar-btn-disabled",
      )}
    >
      {icon}
      <span className="notion-table-toolbar-label">{label}</span>
    </button>
  );
}

export function TableToolbar({
  open,
  position,
  canDeleteRow,
  canDeleteColumn,
  onAddRowAbove,
  onAddRowBelow,
  onAddColumnLeft,
  onAddColumnRight,
  onDeleteRow,
  onDeleteColumn,
}: TableToolbarProps) {
  if (!open || !position) return null;

  return createPortal(
    <div
      className="notion-table-toolbar"
      style={{
        top: position.top,
        left: position.left,
        width: Math.min(position.width, 520),
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="notion-table-toolbar-group">
        <Rows3 className="h-3.5 w-3.5 text-muted" />
        <ToolbarButton label="Row above" onClick={onAddRowAbove} icon={<ArrowUp className="h-3.5 w-3.5" />} />
        <ToolbarButton label="Row below" onClick={onAddRowBelow} icon={<ArrowDown className="h-3.5 w-3.5" />} />
        <ToolbarButton
          label="Delete row"
          onClick={onDeleteRow}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          danger
          disabled={!canDeleteRow}
        />
      </div>

      <div className="notion-table-toolbar-divider" />

      <div className="notion-table-toolbar-group">
        <Columns3 className="h-3.5 w-3.5 text-muted" />
        <ToolbarButton label="Column left" onClick={onAddColumnLeft} icon={<ArrowLeft className="h-3.5 w-3.5" />} />
        <ToolbarButton
          label="Column right"
          onClick={onAddColumnRight}
          icon={<ArrowRight className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          label="Delete column"
          onClick={onDeleteColumn}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          danger
          disabled={!canDeleteColumn}
        />
      </div>
    </div>,
    document.body,
  );
}