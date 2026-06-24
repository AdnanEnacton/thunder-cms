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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
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

  const projectRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      {/* Top Logo */}
      <div className="flex h-14 items-center border-b border-slate-100 px-5">
        <Link href="/dashboard" className="transition-opacity hover:opacity-90">
          <Logo />
        </Link>
      </div>

      {/* Project Switcher Dropdown */}
      <div className="px-4 py-3 border-b border-slate-100" ref={projectRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProjectOpen(!isProjectOpen)}
            className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-thunder-500/10"
          >
            <div className="flex items-center gap-2 truncate">
              <FolderGit2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate font-semibold text-slate-800">
                {projectName}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {isProjectOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-100/50 animate-in fade-in slide-in-from-top-1 duration-100">
              <Link
                href="/dashboard"
                onClick={() => setIsProjectOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                Back to Dashboard
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Project
              </div>
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">No other projects</div>
              ) : (
                <div className="space-y-0.5">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectSelect(project.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                        project.id === currentProjectId
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="my-1 border-t border-slate-100" />
              <Link
                href="/dashboard/projects/new"
                onClick={() => setIsProjectOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-thunder-600 hover:bg-thunder-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect new project
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation - Dashboard, Settings, Media Library */}
      <nav className="border-b border-slate-100 p-3 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
          Dashboard
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150"
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-400" />
          Settings
        </Link>
        <SidebarNavButton
          active={view === "media"}
          icon={<ImageIcon className="h-4 w-4" />}
          label="Media Library"
          onClick={() => onViewChange("media")}
        />
      </nav>

      {/* Scrollable middle panel containing Content Collections and Configurations */}
      <div className="flex-1 overflow-auto p-3 space-y-5">
        {/* Content Section */}
        <div>
          <button
            type="button"
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="flex w-full items-center justify-between px-3.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span>Content</span>
            {isContentExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
          </button>
          
          {isContentExpanded && (
            contentRoots.length === 0 ? (
              <p className="px-3.5 py-2 text-xs text-slate-400 italic">No collections found</p>
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
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Config Files Section */}
        <div>
          <button
            type="button"
            onClick={() => setIsConfigsExpanded(!isConfigsExpanded)}
            className="flex w-full items-center justify-between px-3.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span>Config Files</span>
            {isConfigsExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
          </button>

          {isConfigsExpanded && (
            configLoading ? (
              <p className="px-3.5 py-2 text-xs text-slate-400">Loading...</p>
            ) : configFiles.length === 0 ? (
              <p className="px-3.5 py-2 text-xs text-slate-400 italic">No config files</p>
            ) : (
              <div className="space-y-0.5">
                {configFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onConfigSelect?.(file.path)}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150",
                      view === "config" && activeConfigPath === file.path
                        ? "bg-thunder-50 text-thunder-700 shadow-sm shadow-thunder-50/50"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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

      {/* User Profile Section at Bottom */}
      <div className="border-t border-slate-100 p-4" ref={profileRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50 focus:outline-none transition-colors"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "User Avatar"}
                className="h-9 w-9 shrink-0 rounded-full bg-slate-100 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-thunder-50 font-semibold text-thunder-700">
                {userInitial}
              </div>
            )}
            <div className="flex-1 truncate">
              <p className="truncate text-xs font-semibold text-slate-800">
                {user?.name || "My Workspace"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {user?.email || "No email"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-1.5 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-100/50 animate-in fade-in slide-in-from-bottom-1 duration-100">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Account
              </div>
              <Link
                href="/dashboard/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                Profile Settings
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
}) {
  const isGroupExpanded = !!expandedGroups[root.key];

  if (root.locales.length === 0) {
    const collection = root.defaultCollection;
    if (!collection) return null;

    const isActive = view === "content" && activeCollectionId === collection.id;

    return (
      <div className="space-y-0.5">
        <SidebarItem
          label={root.label}
          active={isActive}
          onClick={() => {
            onViewChange("content");
            onCollectionSelect(collection);
          }}
        />
        {isActive && entries.length > 0 && (
          <div className="space-y-0.5 mt-0.5 pl-3 border-l border-slate-100 ml-5">
            {entries.map((entry) => (
              <SidebarEntryItem
                key={entry.path}
                label={entry.title}
                active={selectedEntryPath === entry.path}
                onClick={() => onEntrySelect?.(entry.path)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => onToggleGroup(root.key)}
        className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 capitalize"
      >
        <div className="flex items-center gap-2">
          {isGroupExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="truncate">{root.label}</span>
        </div>
        {isGroupExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
      </button>

      {isGroupExpanded && (
        <div className="space-y-0.5 mt-0.5 pl-3 border-l border-slate-100 ml-5">
          {root.locales.map((locale) => {
            const isActive = view === "content" && activeCollectionId === locale.id;

            return (
              <div key={locale.id} className="space-y-0.5">
                <SidebarItem
                  label={locale.label}
                  active={isActive}
                  indent={false}
                  onClick={() => {
                    onViewChange("content");
                    onCollectionSelect(locale);
                  }}
                />
                {isActive && entries.length > 0 && (
                  <div className="space-y-0.5 mt-0.5 pl-3 border-l border-slate-100 ml-3">
                    {entries.map((entry) => (
                      <SidebarEntryItem
                        key={entry.path}
                        label={entry.title}
                        active={selectedEntryPath === entry.path}
                        onClick={() => onEntrySelect?.(entry.path)}
                      />
                    ))}
                  </div>
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
        "flex w-full items-center rounded-xl py-2 text-left text-sm font-medium transition-all duration-150 capitalize",
        indent ? "pl-7 pr-3" : "px-3.5",
        active
          ? "bg-thunder-50 text-thunder-700 shadow-sm shadow-thunder-50/50"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      {label}
    </button>
  );
}

function SidebarEntryItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg py-1 px-2.5 text-left text-xs font-normal transition-all duration-150 truncate",
        active
          ? "bg-slate-100 text-slate-900 font-medium"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
      )}
      title={label}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{label}</span>
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
        "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150",
        active
          ? "bg-thunder-50 text-thunder-700 shadow-sm shadow-thunder-50/50"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <div className={cn("transition-colors", active ? "text-thunder-600" : "text-slate-400")}>
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