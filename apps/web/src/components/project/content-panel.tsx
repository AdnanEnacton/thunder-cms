"use client";

import { FileText, Plus, Search } from "lucide-react";
import type { ContentEntrySummary, FieldSchema } from "@thunder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntryListSkeleton } from "@/components/ui/loading-state";

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
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-6 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            {activeCollection?.group
              ? `${activeCollection.group} / ${activeCollection.label}`
              : (activeCollection?.label ?? "Content")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {activeCollection?.folderPath && (
              <span className="ml-1 font-mono text-xs text-muted-foreground">
                · {activeCollection.folderPath}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => onShowNew(true)} disabled={!activeCollection} size="sm">
          <Plus className="h-4 w-4" />
          New entry
        </Button>
      </div>

      {error && (
        <p className="border-b border-destructive/20 bg-destructive/5 px-6 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {showNew && (
        <div className="border-b border-border bg-surface-subtle px-6 py-4">
          <div className="flex max-w-lg items-end gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium tracking-tight">Title</label>
              <Input
                value={newTitle}
                onChange={(e) => onNewTitleChange(e.target.value)}
                placeholder="My new post"
                autoFocus
              />
            </div>
            <Button onClick={onCreate} disabled={creating || !newTitle.trim()} size="sm">
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => onShowNew(false)} size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {entriesLoading ? (
          <EntryListSkeleton />
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
              <FileText className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">No entries yet</p>
              <p className="mt-1 text-sm text-muted">
                Create your first content entry in this collection.
              </p>
            </div>
            <Button onClick={() => onShowNew(true)} size="sm">
              <Plus className="h-4 w-4" />
              Create first entry
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-xs">
              <Search className="h-4 w-4 text-muted" />
              <span className="text-sm text-muted">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} in this collection
              </span>
            </div>
            <div className="space-y-1">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => onSelectEntry(entry.path)}
                  className="group flex w-full items-center justify-between rounded-xl border border-transparent px-4 py-3.5 text-left transition-all hover:border-border hover:bg-surface-raised hover:shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay transition-colors group-hover:bg-thunder-50">
                      <FileText className="h-4 w-4 text-muted group-hover:text-thunder-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium tracking-tight">{entry.title}</p>
                      <p className="truncate font-mono text-xs text-muted">{entry.path}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm text-muted">
                    {entry.date && (
                      <span className="hidden sm:inline text-xs">{entry.date.slice(0, 10)}</span>
                    )}
                    {entry.draft && <span className="badge badge-warning">Draft</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}