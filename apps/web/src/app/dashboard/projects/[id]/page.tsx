import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { ProjectWorkspace } from "@/components/content/project-workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth();
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    notFound();
  }

  if (!project.isConfigured) {
    redirect(`/dashboard/projects/${project.id}/setup`);
  }

  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading content...</div>}>
      <ProjectWorkspace projectId={project.id} projectName={project.name} />
    </Suspense>
  );
}