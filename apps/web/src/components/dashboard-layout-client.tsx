"use client";

import { usePathname } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user?: User;
}

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const pathname = usePathname();

  // Match /dashboard/projects/[id] where [id] is not "new"
  const match = pathname.match(/^\/dashboard\/projects\/([^\/]+)$/);
  const isProjectWorkspace = match && match[1] !== "new";

  if (isProjectWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <DashboardSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-6">
          <div className="text-xs font-medium text-slate-400">
            Console
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
