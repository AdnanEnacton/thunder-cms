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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const activePath = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch projects on mount
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

  // Try to find if currently viewing a project
  const currentProjectId = activePath.match(/\/dashboard\/projects\/([^\/]+)/)?.[1];
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleProjectSelect = (projectId: string) => {
    setIsProjectOpen(false);
    router.push(`/dashboard/projects/${projectId}`);
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "?");

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      {/* Top Logo */}
      <div className="flex h-14 items-center border-b border-slate-100 px-5">
        <Link href="/dashboard" className="transition-opacity hover:opacity-90">
          <Logo />
        </Link>
      </div>

      {/* Project Switcher Dropdown */}
      <div className="px-4 py-3" ref={projectRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProjectOpen(!isProjectOpen)}
            className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-thunder-500/10"
          >
            <div className="flex items-center gap-2 truncate">
              <FolderGit2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate font-semibold text-slate-800">
                {currentProject ? currentProject.name : "Select Project"}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {isProjectOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-100/50 animate-in fade-in slide-in-from-top-1 duration-100">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Project
              </div>
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">No projects connected</div>
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

      {/* Main Navigation Items */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePath === item.href || (item.href !== "/dashboard" && activePath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-thunder-50 text-thunder-700 shadow-sm shadow-thunder-50/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-thunder-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

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