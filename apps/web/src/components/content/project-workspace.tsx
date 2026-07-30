"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import type { ContentEntrySummary, FieldSchema, PageTypeDef } from "@thunder/types";
import { COMPONENT_PAGE_TYPE } from "@/lib/blocks/registry";
import { EntryEditor } from "@/components/content/entry-editor";
import { ContentPanel } from "@/components/project/content-panel";
import { ConfigPanel } from "@/components/project/config-panel";
import { MediaLibrary } from "@/components/project/media-library";
import { PreviewPanel } from "@/components/project/preview-panel";
import {
  ProjectSidebar,
  type ProjectView,
  type SidebarConfigFile,
} from "@/components/project/project-sidebar";
import { LoadingState } from "@/components/ui/loading-state";

interface Collection {
  id: string;
  label: string;
  rootId: string;
  folderPath: string | null;
  group: string | null;
  entryCount: number;
}

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ProjectWorkspaceProps {
  projectId: string;
  projectName: string;
  user?: User;
}

export function ProjectWorkspace({ projectId, projectName, user }: ProjectWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = (searchParams.get("view") as ProjectView) || "content";
  const selectedEntry = searchParams.get("entry");
  const selectedConfig = searchParams.get("config");
  const collectionParam = searchParams.get("collection");

  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
  const [entries, setEntries] = useState<ContentEntrySummary[]>([]);
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const ENTRIES_PAGE_SIZE = 30;
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pageTypes, setPageTypes] = useState<PageTypeDef[]>([]);
  const [newPageType, setNewPageType] = useState<string>("markdown");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [configFiles, setConfigFiles] = useState<SidebarConfigFile[]>([]);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    async function loadCollections() {
      const response = await fetch(`/api/projects/${projectId}/content/collections`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to load collections");
        setLoading(false);
        return;
      }

      const cols = data.collections as Collection[];
      setCollections(cols);

      const initial = cols.find((c) => c.id === collectionParam) ?? cols[0] ?? null;
      setActiveCollection(initial);
      setLoading(false);
    }

    loadCollections();
  }, [projectId, collectionParam]);

  useEffect(() => {
    async function loadConfigs() {
      setConfigLoading(true);
      const response = await fetch(`/api/projects/${projectId}/configs`);
      const data = await response.json();
      setConfigLoading(false);

      if (response.ok) {
        setConfigFiles(
          (data.files ?? []).map((file: { path: string; name: string }) => ({
            path: file.path,
            name: file.name,
          })),
        );
      }
    }

    loadConfigs();
  }, [projectId]);

  const reloadPageTypes = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/blocks`);
    if (!response.ok) return;
    const data = await response.json();
    setPageTypes(Array.isArray(data.pageTypes) ? data.pageTypes : []);
  }, [projectId]);

  useEffect(() => {
    reloadPageTypes();
  }, [reloadPageTypes]);

  useEffect(() => {
    if (view !== "content" || !activeCollection) return;

    async function loadEntries() {
      setEntriesLoading(true);
      const params = new URLSearchParams({
        rootId: activeCollection!.rootId,
        limit: String(ENTRIES_PAGE_SIZE),
        offset: "0",
      });
      if (activeCollection!.folderPath) params.set("folderPath", activeCollection!.folderPath);

      const response = await fetch(
        `/api/projects/${projectId}/content/entries?${params.toString()}`,
      );
      const data = await response.json();
      setEntriesLoading(false);

      if (response.ok) {
        setEntries(data.entries ?? []);
        setFields(data.fields ?? []);
        setTotalEntries(data.total ?? (data.entries ?? []).length);
        setHasMore(Boolean(data.hasMore));
        setError("");
      } else {
        setError(data.error ?? "Failed to load entries");
      }
    }

    loadEntries();
  }, [projectId, activeCollection, view]);

  async function loadMoreEntries() {
    if (!activeCollection || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({
      rootId: activeCollection.rootId,
      limit: String(ENTRIES_PAGE_SIZE),
      offset: String(entries.length),
    });
    if (activeCollection.folderPath) params.set("folderPath", activeCollection.folderPath);

    const response = await fetch(
      `/api/projects/${projectId}/content/entries?${params.toString()}`,
    );
    const data = await response.json();
    setLoadingMore(false);

    if (response.ok) {
      setEntries((prev) => [...prev, ...(data.entries ?? [])]);
      // Merge any newly-seen fields (later pages may surface extra frontmatter keys).
      setFields((prev) => {
        const seen = new Set(prev.map((f) => f.name));
        const extra = ((data.fields ?? []) as FieldSchema[]).filter((f) => !seen.has(f.name));
        return extra.length ? [...prev, ...extra] : prev;
      });
      setTotalEntries(data.total ?? totalEntries);
      setHasMore(Boolean(data.hasMore));
    } else {
      setError(data.error ?? "Failed to load more entries");
    }
  }

  function buildParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
    }
    return params;
  }

  function navigate(overrides: Record<string, string | null>) {
    const params = buildParams(overrides);
    const query = params.toString();
    router.push(`/dashboard/projects/${projectId}${query ? `?${query}` : ""}`);
  }

  function selectView(nextView: ProjectView) {
    navigate({
      view: nextView,
      collection: nextView === "content" ? activeCollection?.id ?? null : null,
      entry: null,
      config: null,
    });
  }

  function selectCollection(collection: Collection) {
    setActiveCollection(collection);
    navigate({
      view: "content",
      collection: collection.id,
      entry: null,
      config: null,
    });
  }

  function selectEntry(path: string) {
    navigate({
      view: "content",
      collection: activeCollection?.id ?? null,
      entry: path,
      config: null,
    });
  }

  function selectConfig(path: string | null) {
    navigate({
      view: "config",
      collection: null,
      entry: null,
      config: path,
    });
  }

  async function handleCreate() {
    if (!activeCollection || !newTitle.trim()) return;
    setCreating(true);

    const isComponentPage = newPageType === COMPONENT_PAGE_TYPE;
    const defaultFrontmatter: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.name === "title") defaultFrontmatter.title = newTitle;
      else if (field.name === "draft") defaultFrontmatter.draft = true;
      else if (field.name === "date") {
        defaultFrontmatter.date = new Date().toISOString().slice(0, 10);
      }
    }

    if (isComponentPage) {
      // Component pages are discriminated by `type` and hold an ordered `blocks` list.
      defaultFrontmatter.type = COMPONENT_PAGE_TYPE;
      defaultFrontmatter.blocks = [];
    }

    // Seed any page-type-specific frontmatter fields (Phase 3 custom page types).
    const selectedType = pageTypes.find((p) => p.key === newPageType);
    for (const field of selectedType?.fields ?? []) {
      if (defaultFrontmatter[field.name] === undefined) {
        defaultFrontmatter[field.name] = field.default ?? "";
      }
    }

    const response = await fetch(`/api/projects/${projectId}/content/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rootId: activeCollection.rootId,
        folderPath: activeCollection.folderPath,
        title: newTitle,
        frontmatter: defaultFrontmatter,
        body: "",
      }),
    });

    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create entry");
      return;
    }

    setShowNew(false);
    setNewTitle("");
    setNewPageType("markdown");
    selectEntry(data.path);
  }

  if (loading) {
    return (
      <LoadingState
        variant="fullscreen"
        title="Scanning your repository"
        description="Reading content collections and folder structure from GitHub."
      />
    );
  }

  function goBackFromEntry() {
    navigate({
      view: "content",
      collection: activeCollection?.id ?? null,
      entry: null,
      config: null,
    });
  }

  if (selectedEntry && view === "content") {
    return (
      <div className="flex h-dvh overflow-hidden">
        <ProjectSidebar
          projectId={projectId}
          projectName={projectName}
          view="content"
          collections={collections}
          activeCollectionId={activeCollection?.id ?? null}
          configFiles={configFiles}
          configLoading={configLoading}
          onViewChange={selectView}
          onCollectionSelect={selectCollection}
          onConfigSelect={selectConfig}
          user={user}
          entries={entries}
          selectedEntryPath={selectedEntry}
          onEntrySelect={selectEntry}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <EntryEditor
            projectId={projectId}
            filePath={selectedEntry}
            onBack={goBackFromEntry}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ProjectSidebar
        projectId={projectId}
        projectName={projectName}
        view={view}
        collections={collections}
        activeCollectionId={activeCollection?.id ?? null}
        configFiles={configFiles}
        activeConfigPath={selectedConfig}
        configLoading={configLoading}
        onViewChange={selectView}
        onCollectionSelect={selectCollection}
        onConfigSelect={selectConfig}
        user={user}
        entries={entries}
        selectedEntryPath={selectedEntry}
        onEntrySelect={selectEntry}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {view === "content" && collections.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface p-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
              <FileText className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">No collections found</p>
              <p className="mt-1 text-sm text-muted">
                No content collections found in your configured folder.
              </p>
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Link
              href={`/dashboard/projects/${projectId}/setup`}
              className="text-sm font-medium text-thunder-600 hover:text-thunder-700 hover:underline"
            >
              Re-run setup
            </Link>
          </div>
        ) : view === "content" ? (
          <ContentPanel
            projectId={projectId}
            activeCollection={activeCollection}
            entries={entries}
            fields={fields}
            entriesLoading={entriesLoading}
            error={error}
            showNew={showNew}
            newTitle={newTitle}
            creating={creating}
            pageTypes={pageTypes}
            newPageType={newPageType}
            onNewPageTypeChange={setNewPageType}
            onPageTypesChanged={reloadPageTypes}
            totalEntries={totalEntries}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMoreEntries}
            onShowNew={setShowNew}
            onNewTitleChange={setNewTitle}
            onCreate={handleCreate}
            onSelectEntry={selectEntry}
          />
        ) : view === "media" ? (
          <MediaLibrary projectId={projectId} />
        ) : view === "preview" ? (
          <PreviewPanel projectId={projectId} />
        ) : (
          <ConfigPanel
            projectId={projectId}
            selectedFile={selectedConfig}
            onSelectFile={selectConfig}
          />
        )}
      </main>
    </div>
  );
}