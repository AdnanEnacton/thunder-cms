"use client";

import { Table } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TableInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (columns: number, rows: number) => void;
}

export function TableInsertDialog({ open, onClose, onInsert }: TableInsertDialogProps) {
  const [columns, setColumns] = useState("3");
  const [rows, setRows] = useState("3");

  if (!open) return null;

  function parseDimension(value: string, fallback: number, max: number): number {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.max(1, Math.min(max, parsed));
  }

  function handleInsert() {
    const cols = parseDimension(columns, 3, 10);
    const rowCount = parseDimension(rows, 3, 20);
    onInsert(cols, rowCount);
    onClose();
    setColumns("3");
    setRows("3");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-thunder-50 text-thunder-600">
            <Table className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Insert table</h3>
            <p className="text-xs text-muted">Choose the size, then edit cells freely.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="table-cols">Columns</Label>
            <Input
              id="table-cols"
              type="number"
              min={1}
              max={10}
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="table-rows">Rows</Label>
            <Input
              id="table-rows"
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          Click inside the table later to add or remove rows and columns.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleInsert}>
            Insert table
          </Button>
        </div>
      </div>
    </div>
  );
}