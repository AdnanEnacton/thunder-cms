"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import type { ContentEntrySummary, FieldSchema } from "@thunder/types";
import { EntryEditor } from "@/components/content/entry-editor";
import { ContentPanel } from "@/components/project/content-panel";
import { ConfigPanel } from "@/components/project/config-panel";
import { MediaLibrary } from "@/components/project/media-library";
import {
  ProjectSidebar,
  type ProjectView,
  type SidebarConfigFile,
} from "@/components/project/project-sidebar";

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
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
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

  useEffect(() => {
    if (view !== "content" || !activeCollection) return;

    async function loadEntries() {
      setEntriesLoading(true);
      const params = new URLSearchParams({ rootId: activeCollection!.rootId });
      if (activeCollection!.folderPath) params.set("folderPath", activeCollection!.folderPath);

      const response = await fetch(
        `/api/projects/${projectId}/content/entries?${params.toString()}`,
      );
      const data = await response.json();
      setEntriesLoading(false);

      if (response.ok) {
        setEntries(data.entries ?? []);
        setFields(data.fields ?? []);
        setError("");
      } else {
        setError(data.error ?? "Failed to load entries");
      }
    }

    loadEntries();
  }, [projectId, activeCollection, view]);

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

    const defaultFrontmatter: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.name === "title") defaultFrontmatter.title = newTitle;
      else if (field.name === "draft") defaultFrontmatter.draft = true;
      else if (field.name === "date") {
        defaultFrontmatter.date = new Date().toISOString().slice(0, 10);
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
    selectEntry(data.path);
  }

  if (loading) {
    return <div className="p-8 text-muted">Scanning content from repository...</div>;
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
      <div className="flex h-screen">
        <ProjectSidebar
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
        <main className="flex-1 overflow-hidden">
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
    <div className="flex h-screen">
      <ProjectSidebar
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

      <main className="flex flex-1 flex-col overflow-hidden">
        {view === "content" && collections.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center text-muted">
            <FileText className="h-10 w-10" />
            <p>No content collections found in your configured folder.</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Link
              href={`/dashboard/projects/${projectId}/setup`}
              className="text-sm text-thunder-400 hover:underline"
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
            onShowNew={setShowNew}
            onNewTitleChange={setNewTitle}
            onCreate={handleCreate}
            onSelectEntry={selectEntry}
          />
        ) : view === "media" ? (
          <MediaLibrary projectId={projectId} />
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