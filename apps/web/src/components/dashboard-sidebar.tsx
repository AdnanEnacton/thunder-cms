"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderGit2, LayoutDashboard, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const activePath = usePathname();
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface-raised">
      <div className="border-b border-border px-5 py-4">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePath === item.href || activePath.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-thunder-600/15 text-thunder-300"
                  : "text-muted hover:bg-surface-overlay hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}