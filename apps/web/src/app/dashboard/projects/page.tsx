import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted">Git-connected sites managed with THUNDER-CMS.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted">
              No projects yet.{" "}
              <Link href="/dashboard/projects/new" className="text-thunder-400 hover:underline">
                Connect your first repository
              </Link>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.gitRepoFullName}</CardDescription>
                </div>
                <Link
                  href={
                    project.isConfigured
                      ? `/dashboard/projects/${project.id}`
                      : `/dashboard/projects/${project.id}/setup`
                  }
                >
                  <Button variant="secondary" size="sm">
                    {project.isConfigured ? "Open" : "Finish setup"}
                  </Button>
                </Link>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}