import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { ProjectSubpageLayout } from "@/components/project/project-subpage-layout";
import { ProjectSettingsClient } from "@/components/project/project-settings-client";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <ProjectSubpageLayout projectId={id} projectName={project.name} user={session?.user}>
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        <div className="page-header">
          <h1 className="page-title">Project settings</h1>
          <p className="page-description">
            Commit preferences and preview configuration for <strong>{project.name}</strong>.
          </p>
        </div>
        <ProjectSettingsClient projectId={id} />
      </div>
    </ProjectSubpageLayout>
  );
}
