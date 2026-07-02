"use client";

import { ProjectSidebar, type ProjectView } from "@/components/project/project-sidebar";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface Props {
  projectId: string;
  projectName: string;
  user?: User;
  children: React.ReactNode;
}

export function ProjectSubpageLayout({ projectId, projectName, user, children }: Props) {
  return (
    <div className="flex h-screen">
      <ProjectSidebar
        projectId={projectId}
        projectName={projectName}
        view={"content" as ProjectView}
        collections={[]}
        activeCollectionId={null}
        configFiles={[]}
        configLoading={false}
        onViewChange={() => {}}
        onCollectionSelect={() => {}}
        onConfigSelect={() => {}}
        user={user}
      />
      <main className="flex-1 overflow-auto bg-surface">{children}</main>
    </div>
  );
}
