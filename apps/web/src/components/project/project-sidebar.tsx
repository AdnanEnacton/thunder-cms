"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectView = "content" | "media" | "config";

export interface SidebarCollection {
  id: string;
  label: string;
  rootId: string;
  folderPath: string | null;
  group: string | null;
  entryCount: number;
}

export interface SidebarConfigFile {
  path: string;
  name: string;
}

interface ProjectSidebarProps {
  projectName: string;
  view: ProjectView;
  collections: SidebarCollection[];
  activeCollectionId: string | null;
  configFiles?: SidebarConfigFile[];
  activeConfigPath?: string | null;
  configLoading?: boolean;
  onViewChange: (view: ProjectView) => void;
  onCollectionSelect: (collection: SidebarCollection) => void;
  onConfigSelect?: (path: string) => void;
}

export function ProjectSidebar({
  projectName,
  view,
  collections,
  activeCollectionId,
  configFiles = [],
  activeConfigPath = null,
  configLoading = false,
  onViewChange,
  onCollectionSelect,
  onConfigSelect,
}: ProjectSidebarProps) {
  const contentRoots = getContentRootItems(collections);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-raised">
      <div className="border-b border-border px-4 py-3">
        <p className="truncate text-sm font-semibold text-foreground">{projectName}</p>
      </div>

      <nav className="border-b border-border p-2">
        <SidebarNavButton
          active={view === "media"}
          icon={<ImageIcon className="h-4 w-4" />}
          label="Media"
          onClick={() => onViewChange("media")}
        />
      </nav>

      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-4">
          <div>
            <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              Content
            </p>
            {contentRoots.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No collections found</p>
            ) : (
              <div className="space-y-0.5">
                {contentRoots.map((root) => (
                  <CollectionGroup
                    key={root.key}
                    root={root}
                    view={view}
                    activeCollectionId={activeCollectionId}
                    onCollectionSelect={onCollectionSelect}
                    onViewChange={onViewChange}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              Config
            </p>
            {configLoading ? (
              <p className="px-3 py-2 text-xs text-muted">Loading...</p>
            ) : configFiles.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No config files</p>
            ) : (
              <div className="space-y-0.5">
                {configFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onConfigSelect?.(file.path)}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm",
                      view === "config" && activeConfigPath === file.path
                        ? "bg-thunder-50 font-medium text-thunder-700"
                        : "text-muted hover:bg-surface-overlay hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function CollectionGroup({
  root,
  view,
  activeCollectionId,
  onCollectionSelect,
  onViewChange,
}: {
  root: ContentRootGroup;
  view: ProjectView;
  activeCollectionId: string | null;
  onCollectionSelect: (collection: SidebarCollection) => void;
  onViewChange: (view: ProjectView) => void;
}) {
  if (root.locales.length === 0) {
    const collection = root.defaultCollection;
    if (!collection) return null;

    return (
      <SidebarItem
        label={root.label}
        active={view === "content" && activeCollectionId === collection.id}
        onClick={() => {
          onViewChange("content");
          onCollectionSelect(collection);
        }}
      />
    );
  }

  return (
    <div>
      <p className="px-3 py-1 text-xs text-muted">{root.label}</p>
      {root.locales.map((locale) => (
        <SidebarItem
          key={locale.id}
          label={locale.label}
          indent
          active={view === "content" && activeCollectionId === locale.id}
          onClick={() => {
            onViewChange("content");
            onCollectionSelect(locale);
          }}
        />
      ))}
    </div>
  );
}

function SidebarItem({
  label,
  active,
  indent,
  onClick,
}: {
  label: string;
  active: boolean;
  indent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-lg py-2 text-left text-sm capitalize",
        indent ? "px-5" : "px-3",
        active
          ? "bg-thunder-50 font-medium text-thunder-700"
          : "text-muted hover:bg-surface-overlay hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SidebarNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
        active
          ? "bg-thunder-50 font-medium text-thunder-700"
          : "text-muted hover:bg-surface-overlay hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface ContentRootGroup {
  key: string;
  label: string;
  defaultCollection: SidebarCollection | null;
  locales: SidebarCollection[];
}

function getContentRootItems(collections: SidebarCollection[]): ContentRootGroup[] {
  const grouped = new Map<string, SidebarCollection[]>();
  const standalone: SidebarCollection[] = [];

  for (const collection of collections) {
    if (collection.group) {
      const items = grouped.get(collection.group) ?? [];
      items.push(collection);
      grouped.set(collection.group, items);
    } else {
      standalone.push(collection);
    }
  }

  const result: ContentRootGroup[] = standalone.map((collection) => ({
    key: collection.id,
    label: collection.label.toLowerCase(),
    defaultCollection: collection,
    locales: [],
  }));

  for (const [group, items] of grouped) {
    result.push({
      key: group,
      label: group.toLowerCase(),
      defaultCollection: null,
      locales: items
        .map((item) => ({ ...item, label: item.label.toLowerCase() }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}