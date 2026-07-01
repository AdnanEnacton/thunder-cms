import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { ProjectWorkspace } from "@/components/content/project-workspace";
import { LoadingState } from "@/components/ui/loading-state";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    notFound();
  }

  if (!project.isConfigured) {
    redirect(`/dashboard/projects/${project.id}/setup`);
  }

  return (
    <Suspense
      fallback={
        <LoadingState
          variant="fullscreen"
          title="Opening project"
          description="Preparing your content workspace."
        />
      }
    >
      <ProjectWorkspace
        projectId={project.id}
        projectName={project.name}
        user={session?.user}
      />
    </Suspense>
  );
}