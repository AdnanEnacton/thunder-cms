"use client";

import { FileText, Plus } from "lucide-react";
import type { ContentEntrySummary, FieldSchema } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Collection {
  id: string;
  label: string;
  rootId: string;
  folderPath: string | null;
  group: string | null;
  entryCount: number;
}

interface ContentPanelProps {
  projectId: string;
  activeCollection: Collection | null;
  entries: ContentEntrySummary[];
  fields: FieldSchema[];
  entriesLoading: boolean;
  error: string;
  showNew: boolean;
  newTitle: string;
  creating: boolean;
  onShowNew: (show: boolean) => void;
  onNewTitleChange: (value: string) => void;
  onCreate: () => void;
  onSelectEntry: (path: string) => void;
}

export function ContentPanel({
  activeCollection,
  entries,
  entriesLoading,
  error,
  showNew,
  newTitle,
  creating,
  onShowNew,
  onNewTitleChange,
  onCreate,
  onSelectEntry,
}: ContentPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-semibold">
            {activeCollection?.group
              ? `${activeCollection.group} / ${activeCollection.label}`
              : (activeCollection?.label ?? "Content")}
          </h2>
          <p className="text-sm text-muted">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {activeCollection?.folderPath && (
              <span className="font-mono"> — {activeCollection.folderPath}</span>
            )}
          </p>
        </div>
        <Button onClick={() => onShowNew(true)} disabled={!activeCollection}>
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {error && <p className="px-6 py-2 text-sm text-red-400">{error}</p>}

      {showNew && (
        <div className="border-b border-border bg-surface-overlay px-6 py-4">
          <div className="flex max-w-md items-end gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newTitle}
                onChange={(e) => onNewTitleChange(e.target.value)}
                placeholder="My new post"
              />
            </div>
            <Button onClick={onCreate} disabled={creating || !newTitle.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => onShowNew(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {entriesLoading ? (
          <div className="px-6 py-16 text-center text-muted">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center text-muted">
            <FileText className="h-10 w-10" />
            <p>No content entries found in this folder.</p>
            <Button onClick={() => onShowNew(true)}>Create first entry</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => onSelectEntry(entry.path)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-overlay"
              >
                <div>
                  <p className="font-medium">{entry.title}</p>
                  <p className="font-mono text-xs text-muted">{entry.path}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted">
                  {entry.date && <span>{entry.date.slice(0, 10)}</span>}
                  {entry.draft && (
                    <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 text-xs font-medium">
                      draft
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}