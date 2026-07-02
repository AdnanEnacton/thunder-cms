"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ImageIcon,
  FolderGit2,
  ChevronsUpDown,
  Plus,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Settings,
  Folder,
  FolderOpen,
  Activity,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BranchSelector } from "@/components/project/branch-selector";
import type { ContentEntrySummary } from "@thunder/types";

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

interface Project {
  id: string;
  name: string;
}

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ProjectSidebarProps {
  projectId: string;
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
  user?: User;
  
  // Custom tree props
  entries?: ContentEntrySummary[];
  selectedEntryPath?: string | null;
  onEntrySelect?: (path: string) => void;
}

export function ProjectSidebar({
  projectId,
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
  user,
  entries = [],
  selectedEntryPath = null,
  onEntrySelect,
}: ProjectSidebarProps) {
  const router = useRouter();
  const activePath = usePathname();
  const contentRoots = getContentRootItems(collections);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Accordions expanded states
  const [isContentExpanded, setIsContentExpanded] = useState(true);
  const [isConfigsExpanded, setIsConfigsExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [openEntriesDropdown, setOpenEntriesDropdown] = useState<string | null>(null);

  const projectRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const entriesDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch projects on mount for the switcher
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects in project sidebar", err);
      }
    }
    fetchProjects();
  }, []);

  // Click outside handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (entriesDropdownRef.current && !entriesDropdownRef.current.contains(event.target as Node)) {
        setOpenEntriesDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenEntriesDropdown(null);
  }, [activeCollectionId, selectedEntryPath]);

  // Auto-expand collection group on activeCollectionId change
  useEffect(() => {
    if (activeCollectionId && collections.length > 0) {
      const activeCollection = collections.find((c) => c.id === activeCollectionId);
      if (activeCollection && activeCollection.group) {
        setExpandedGroups((prev) => ({
          ...prev,
          [activeCollection.group!]: true,
        }));
      }
    }
  }, [activeCollectionId, collections]);

  // Extract current project ID from pathname
  const currentProjectId = activePath.match(/\/dashboard\/projects\/([^\/]+)/)?.[1];

  const handleProjectSelect = (projectId: string) => {
    setIsProjectOpen(false);
    router.push(`/dashboard/projects/${projectId}`);
  };

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : "?");

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-surface-raised">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>

      <div className="border-b border-border px-3 pb-3" ref={projectRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProjectOpen(!isProjectOpen)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-thunder-300/50 hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-thunder-500/20"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FolderGit2 className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate font-semibold text-foreground">{projectName}</span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
          </button>

          {isProjectOpen && (
            <div className="dropdown-menu absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto">
              <Link
                href="/dashboard"
                onClick={() => setIsProjectOpen(false)}
                className="dropdown-item font-semibold"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-muted" />
                Back to dashboard
              </Link>
              <div className="my-1 border-t border-border" />
              <div className="dropdown-label">Switch project</div>
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted">No other projects</div>
              ) : (
                <div className="space-y-0.5">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectSelect(project.id)}
                      className={cn(
                        "dropdown-item",
                        project.id === currentProjectId && "dropdown-item-active",
                      )}
                    >
                      <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="my-1 border-t border-border" />
              <Link
                href="/dashboard/projects/new"
                onClick={() => setIsProjectOpen(false)}
                className="dropdown-item font-medium text-thunder-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect new project
              </Link>
            </div>
          )}
        </div>
      </div>

      <BranchSelector projectId={projectId} />

      <nav className="space-y-0.5 border-b border-border p-3">
        <Link href="/dashboard" className="nav-item">
          <LayoutDashboard className="h-4 w-4 shrink-0 text-muted" />
          Dashboard
        </Link>
        <Link href="/dashboard/settings" className="nav-item">
          <Settings className="h-4 w-4 shrink-0 text-muted" />
          Settings
        </Link>
        <SidebarNavButton
          active={view === "media"}
          icon={<ImageIcon className="h-4 w-4" />}
          label="Media library"
          onClick={() => onViewChange("media")}
        />
        <Link
          href={`/dashboard/projects/${projectId}/team`}
          className={cn(
            "nav-item",
            activePath === `/dashboard/projects/${projectId}/team` && "nav-item-active",
          )}
        >
          <Users className="h-4 w-4 shrink-0 text-muted" />
          Team
        </Link>
        <Link
          href={`/dashboard/projects/${projectId}/activity`}
          className={cn(
            "nav-item",
            activePath === `/dashboard/projects/${projectId}/activity` && "nav-item-active",
          )}
        >
          <Activity className="h-4 w-4 shrink-0 text-muted" />
          Activity
        </Link>
        <Link
          href={`/dashboard/projects/${projectId}/settings`}
          className={cn(
            "nav-item",
            activePath === `/dashboard/projects/${projectId}/settings` && "nav-item-active",
          )}
        >
          <Settings className="h-4 w-4 shrink-0 text-muted" />
          Project settings
        </Link>
      </nav>

      <div className="flex-1 space-y-5 overflow-auto p-3">
        <div>
          <button
            type="button"
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="dropdown-label flex w-full items-center justify-between px-2 pb-2 hover:text-muted"
          >
            <span>Content</span>
            {isContentExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>

          {isContentExpanded && (
            contentRoots.length === 0 ? (
              <p className="px-2 py-2 text-xs italic text-muted">No collections found</p>
            ) : (
              <div className="space-y-1">
                {contentRoots.map((root) => (
                  <CollectionGroup
                    key={root.key}
                    root={root}
                    view={view}
                    activeCollectionId={activeCollectionId}
                    onCollectionSelect={onCollectionSelect}
                    onViewChange={onViewChange}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroup}
                    entries={entries}
                    selectedEntryPath={selectedEntryPath}
                    onEntrySelect={onEntrySelect}
                    openEntriesDropdown={openEntriesDropdown}
                    onEntriesDropdownChange={setOpenEntriesDropdown}
                    entriesDropdownRef={entriesDropdownRef}
                  />
                ))}
              </div>
            )
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsConfigsExpanded(!isConfigsExpanded)}
            className="dropdown-label flex w-full items-center justify-between px-2 pb-2 hover:text-muted"
          >
            <span>Config files</span>
            {isConfigsExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>

          {isConfigsExpanded && (
            configLoading ? (
              <p className="px-2 py-2 text-xs text-muted">Loading...</p>
            ) : configFiles.length === 0 ? (
              <p className="px-2 py-2 text-xs italic text-muted">No config files</p>
            ) : (
              <div className="space-y-0.5">
                {configFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onConfigSelect?.(file.path)}
                    className={cn(
                      "nav-item w-full",
                      view === "config" && activeConfigPath === file.path && "nav-item-active",
                    )}
                  >
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <div className="border-t border-border p-3" ref={profileRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-overlay focus:outline-none"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "User Avatar"}
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-thunder-100 text-xs font-semibold text-thunder-700">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.name || "My Workspace"}
              </p>
              <p className="truncate text-[11px] text-muted">{user?.email || "No email"}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
          </button>

          {isProfileOpen && (
            <div className="dropdown-menu absolute bottom-full left-0 right-0 z-50 mb-1.5">
              <div className="dropdown-label">Account</div>
              <Link
                href="/dashboard/settings"
                onClick={() => setIsProfileOpen(false)}
                className="dropdown-item"
              >
                <UserIcon className="h-3.5 w-3.5 text-muted" />
                Profile settings
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="dropdown-item w-full font-medium text-destructive hover:bg-destructive/5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
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
  expandedGroups,
  onToggleGroup,
  entries = [],
  selectedEntryPath = null,
  onEntrySelect,
  openEntriesDropdown,
  onEntriesDropdownChange,
  entriesDropdownRef,
}: {
  root: ContentRootGroup;
  view: ProjectView;
  activeCollectionId: string | null;
  onCollectionSelect: (collection: SidebarCollection) => void;
  onViewChange: (view: ProjectView) => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupKey: string) => void;
  entries?: ContentEntrySummary[];
  selectedEntryPath?: string | null;
  onEntrySelect?: (path: string) => void;
  openEntriesDropdown: string | null;
  onEntriesDropdownChange: (id: string | null) => void;
  entriesDropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isGroupExpanded = !!expandedGroups[root.key];

  if (root.locales.length === 0) {
    const collection = root.defaultCollection;
    if (!collection) return null;

    const isActive = view === "content" && activeCollectionId === collection.id;

    return (
      <div className="space-y-0.5">
        {isActive && entries.length > 0 ? (
          <SidebarEntriesDropdown
            label={root.label}
            entries={entries}
            selectedEntryPath={selectedEntryPath}
            onEntrySelect={onEntrySelect}
            isOpen={openEntriesDropdown === collection.id}
            onToggle={() =>
              onEntriesDropdownChange(
                openEntriesDropdown === collection.id ? null : collection.id,
              )
            }
            dropdownRef={entriesDropdownRef}
          />
        ) : (
          <SidebarItem
            label={root.label}
            active={isActive}
            onClick={() => {
              onViewChange("content");
              onCollectionSelect(collection);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => onToggleGroup(root.key)}
        className="nav-item w-full justify-between capitalize"
      >
        <div className="flex items-center gap-2">
          {isGroupExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-muted" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted" />
          )}
          <span className="truncate">{root.label}</span>
        </div>
        {isGroupExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
        )}
      </button>

      {isGroupExpanded && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {root.locales.map((locale) => {
            const isActive = view === "content" && activeCollectionId === locale.id;

            return (
              <div key={locale.id} className="space-y-0.5">
                {isActive && entries.length > 0 ? (
                  <SidebarEntriesDropdown
                    label={locale.label}
                    entries={entries}
                    selectedEntryPath={selectedEntryPath}
                    onEntrySelect={onEntrySelect}
                    isOpen={openEntriesDropdown === locale.id}
                    onToggle={() =>
                      onEntriesDropdownChange(
                        openEntriesDropdown === locale.id ? null : locale.id,
                      )
                    }
                    dropdownRef={entriesDropdownRef}
                    indented
                  />
                ) : (
                  <SidebarItem
                    label={locale.label}
                    active={isActive}
                    indent={false}
                    onClick={() => {
                      onViewChange("content");
                      onCollectionSelect(locale);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
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
        "nav-item w-full capitalize",
        indent && "pl-7",
        active && "nav-item-active",
      )}
    >
      {label}
    </button>
  );
}

function SidebarEntriesDropdown({
  label,
  entries,
  selectedEntryPath,
  onEntrySelect,
  isOpen,
  onToggle,
  dropdownRef,
  indented = false,
}: {
  label: string;
  entries: ContentEntrySummary[];
  selectedEntryPath?: string | null;
  onEntrySelect?: (path: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  indented?: boolean;
}) {
  const selectedEntry = entries.find((e) => e.path === selectedEntryPath);
  const triggerLabel = selectedEntry?.title ?? label;

  return (
    <div
      className={cn("relative", indented ? "ml-0" : "ml-5 border-l border-border pl-3")}
      ref={isOpen ? dropdownRef : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all",
          isOpen
            ? "border-thunder-300 bg-thunder-50 text-thunder-700 shadow-xs"
            : "border-border bg-surface-subtle text-foreground hover:border-thunder-300/50 hover:bg-surface-overlay",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="truncate capitalize">{triggerLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] font-medium text-muted">{entries.length}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="dropdown-menu absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <div className="dropdown-label capitalize">{label} · {entries.length} entries</div>
          <div className="space-y-0.5">
            {entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => {
                  onEntrySelect?.(entry.path);
                  onToggle();
                }}
                className={cn(
                  "dropdown-item",
                  selectedEntryPath === entry.path && "dropdown-item-active",
                )}
                title={entry.title}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="truncate">{entry.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
      className={cn("nav-item w-full", active && "nav-item-active")}
    >
      <div className={cn("transition-colors", active ? "text-thunder-600" : "text-muted")}>
        {icon}
      </div>
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