import Link from "next/link";
import { FolderGit2, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage() {
  const session = await auth();

  const memberships = await prisma.membership.findMany({
    where: { userId: session!.user!.id },
    include: {
      organization: {
        include: {
          projects: { orderBy: { updatedAt: "desc" } },
        },
      },
    },
  });

  const projects = memberships.flatMap((m) => m.organization.projects);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Projects</h1>
          <p className="page-description">
            Git-connected sites managed with THUNDER-CMS.
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
            <FolderGit2 className="h-7 w-7 text-muted" />
          </div>
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="mt-1 text-sm text-muted">
              Connect your first GitHub repository to start editing content.
            </p>
          </div>
          <Link href="/dashboard/projects/new">
            <Button>Connect repository</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="surface-card surface-card-hover flex flex-col p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-thunder-50 to-thunder-100">
                    <FolderGit2 className="h-5 w-5 text-thunder-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight">{project.name}</h3>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {project.gitRepoFullName}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    project.isConfigured ? "badge badge-success" : "badge badge-warning"
                  }
                >
                  {project.isConfigured ? "Ready" : "Setup"}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Link
                  href={
                    project.isConfigured
                      ? `/dashboard/projects/${project.id}`
                      : `/dashboard/projects/${project.id}/setup`
                  }
                  className="flex-1"
                >
                  <Button
                    variant={project.isConfigured ? "default" : "secondary"}
                    className="w-full"
                    size="sm"
                  >
                    {project.isConfigured ? "Open project" : "Finish setup"}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}