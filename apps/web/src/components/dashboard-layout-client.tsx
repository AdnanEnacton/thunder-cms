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

  const match = pathname.match(/^\/dashboard\/projects\/([^\/]+)(\/.*)?$/);
  const projectId = match?.[1];
  const isProjectWorkspace = projectId && projectId !== "new";

  if (isProjectWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <DashboardSidebar user={user} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-7 sm:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
