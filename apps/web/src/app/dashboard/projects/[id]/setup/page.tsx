import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { SetupWizard } from "@/components/setup-wizard";

export default async function ProjectSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || !project.gitRepoOwner || !project.gitRepoName) {
    notFound();
  }

  if (project.isConfigured) {
    redirect(`/dashboard/projects/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="page-header">
        <h1 className="page-title">Configure {project.name}</h1>
        <p className="page-description">
          Tell THUNDER-CMS where your content and media live in{" "}
          <span className="font-mono text-sm text-foreground">{project.gitRepoFullName}</span>.
        </p>
      </div>
      <SetupWizard
        projectId={project.id}
        repoOwner={project.gitRepoOwner}
        repoName={project.gitRepoName}
        defaultBranch={project.defaultBranch}
        initialFramework={project.framework}
      />
    </div>
  );
}