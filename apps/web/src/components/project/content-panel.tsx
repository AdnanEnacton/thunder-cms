"use client";

import { useMemo, useState } from "react";
import { Blocks, FileText, Plus, Search, Settings2 } from "lucide-react";
import type { ContentEntrySummary, FieldSchema, PageTypeDef } from "@thunder/types";
import { PageTypesDialog } from "@/components/content/page-builder/page-types-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntryListSkeleton } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

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
  pageTypes: PageTypeDef[];
  newPageType: string;
  onNewPageTypeChange: (key: string) => void;
  onPageTypesChanged: () => void;
  totalEntries: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onShowNew: (show: boolean) => void;
  onNewTitleChange: (value: string) => void;
  onCreate: () => void;
  onSelectEntry: (path: string) => void;
}

export function ContentPanel({
  projectId,
  activeCollection,
  entries,
  entriesLoading,
  error,
  showNew,
  newTitle,
  creating,
  pageTypes,
  newPageType,
  onNewPageTypeChange,
  onPageTypesChanged,
  totalEntries,
  hasMore,
  loadingMore,
  onLoadMore,
  onShowNew,
  onNewTitleChange,
  onCreate,
  onSelectEntry,
}: ContentPanelProps) {
  const [sortBy, setSortBy] = useState<"updated" | "title" | "date-desc" | "date-asc">("updated");
  const [draftFilter, setDraftFilter] = useState<"all" | "draft" | "published">("all");
  const [query, setQuery] = useState("");
  const [managePageTypes, setManagePageTypes] = useState(false);

  const visibleEntries = useMemo(() => {
    let result = entries;

    if (draftFilter === "draft") {
      result = result.filter((e) => e.draft);
    } else if (draftFilter === "published") {
      result = result.filter((e) => !e.draft);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || e.path.toLowerCase().includes(q),
      );
    }

    const sorted = [...result];
    if (sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "date-desc") {
      sorted.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    } else if (sortBy === "date-asc") {
      sorted.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    }

    return sorted;
  }, [entries, draftFilter, query, sortBy]);

  const draftCount = entries.filter((e) => e.draft).length;  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-6 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            {activeCollection?.group
              ? `${activeCollection.group} / ${activeCollection.label}`
              : (activeCollection?.label ?? "Content")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
            {hasMore && <span className="text-muted-foreground"> · {entries.length} loaded</span>}
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
          <div className="max-w-2xl space-y-4">
            {pageTypes.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium tracking-tight">Page type</label>
                  <button
                    type="button"
                    onClick={() => setManagePageTypes(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-thunder-600"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Manage page types
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {pageTypes.map((pt) => {
                    const active = pt.key === newPageType;
                    const isComponent = pt.key === "component";
                    return (
                      <button
                        key={pt.key}
                        type="button"
                        onClick={() => onNewPageTypeChange(pt.key)}
                        className={cn(
                          "flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-all",
                          active
                            ? "border-thunder-300 bg-surface-raised shadow-sm ring-1 ring-thunder-500/20"
                            : "border-border bg-surface-raised hover:border-thunder-200 hover:shadow-xs",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {isComponent ? (
                            <Blocks className="h-3.5 w-3.5 text-thunder-600" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-muted" />
                          )}
                          {pt.label}
                        </span>
                        {pt.description && (
                          <span className="line-clamp-2 text-[11px] leading-snug text-muted">
                            {pt.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium tracking-tight">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => onNewTitleChange(e.target.value)}
                  placeholder="My new page"
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
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-xs">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="w-full bg-transparent pl-6 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-0.5 rounded-lg bg-surface-subtle p-0.5">
                {([
                  { id: "all" as const, label: "All" },
                  { id: "draft" as const, label: "Drafts" },
                  { id: "published" as const, label: "Published" },
                ]).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDraftFilter(id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      draftFilter === id
                        ? "bg-surface-raised text-foreground shadow-xs"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {label}
                    {id === "draft" && draftCount > 0 && (
                      <span className="ml-1 text-muted-foreground">{draftCount}</span>
                    )}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-surface-overlay focus:border-thunder-400"
              >
                <option value="updated">Last updated</option>
                <option value="title">Title A-Z</option>
                <option value="date-desc">Newest date</option>
                <option value="date-asc">Oldest date</option>
              </select>

              <span className="ml-auto text-xs text-muted">
                {visibleEntries.length}{visibleEntries.length !== entries.length && ` / ${entries.length}`}
              </span>
            </div>

            {visibleEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <p className="font-medium">No matching entries</p>
                <p className="text-sm text-muted">Try a different filter or search term.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleEntries.map((entry) => (
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
            )}

            {hasMore && (
              <div className="mt-3 flex flex-col items-center gap-1.5 border-t border-border pt-4">
                {(query.trim() || draftFilter !== "all") && (
                  <p className="text-xs text-muted-foreground">
                    Search and filters apply to loaded entries only.
                  </p>
                )}
                <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore
                    ? "Loading…"
                    : `Load more (${entries.length} of ${totalEntries})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <PageTypesDialog
        open={managePageTypes}
        projectId={projectId}
        onClose={() => setManagePageTypes(false)}
        onSaved={onPageTypesChanged}
      />
    </div>
  );
}