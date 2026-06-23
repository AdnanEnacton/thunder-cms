import Link from "next/link";
import { FolderGit2, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  const memberships = await prisma.membership.findMany({
    where: { userId: session!.user!.id },
    include: {
      organization: {
        include: {
          projects: {
            orderBy: { updatedAt: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  const projects = memberships.flatMap((m) => m.organization.projects);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted">Manage your Git-connected content projects.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Projects</CardDescription>
            <CardTitle className="text-3xl">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Configured</CardDescription>
            <CardTitle className="text-3xl">
              {projects.filter((p) => p.isConfigured).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending setup</CardDescription>
            <CardTitle className="text-3xl">
              {projects.filter((p) => !p.isConfigured).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
          <CardDescription>Your latest connected repositories.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <FolderGit2 className="h-10 w-10 text-muted" />
              <p className="text-muted">No projects yet. Connect your first GitHub repository.</p>
              <Link href="/dashboard/projects/new">
                <Button>Connect repository</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={
                    project.isConfigured
                      ? `/dashboard/projects/${project.id}`
                      : `/dashboard/projects/${project.id}/setup`
                  }
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-surface-overlay"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted">{project.gitRepoFullName}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      project.isConfigured
                        ? "bg-green-500/15 text-green-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {project.isConfigured ? "Ready" : "Setup required"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}