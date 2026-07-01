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

  const match = pathname.match(/^\/dashboard\/projects\/([^\/]+)$/);
  const isProjectWorkspace = match && match[1] !== "new";

  if (isProjectWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <DashboardSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}