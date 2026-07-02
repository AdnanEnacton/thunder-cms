"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FolderGit2,
  LayoutDashboard,
  Settings,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  gitRepoFullName?: string;
}

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardSidebarProps {
  user?: User;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: true },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const activePath = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects in sidebar", err);
      }
    }
    fetchProjects();
  }, []);

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

  const currentProjectId = activePath.match(/\/dashboard\/projects\/([^\/]+)/)?.[1];
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleProjectSelect = (projectId: string) => {
    setIsProjectOpen(false);
    router.push(`/dashboard/projects/${projectId}`);
  };

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : "?";

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-surface-raised">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>

      <div className="px-3 pb-3" ref={projectRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProjectOpen(!isProjectOpen)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-thunder-300/50 hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-thunder-500/20"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FolderGit2 className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate font-semibold text-foreground">
                {currentProject ? currentProject.name : "Select project"}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
          </button>

          {isProjectOpen && (
            <div className="dropdown-menu absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto">
              <div className="dropdown-label">Switch project</div>
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted">No projects connected</div>
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
                className="dropdown-item font-medium text-thunder-600 hover:text-thunder-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect new project
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? activePath === item.href
            : activePath === item.href || activePath.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-item", active && "nav-item-active")}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-thunder-600" : "text-muted",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

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