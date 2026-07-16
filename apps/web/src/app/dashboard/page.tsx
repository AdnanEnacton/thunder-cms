import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FolderGit2, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { Button } from "@/components/ui/button";

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
  const configured = projects.filter((p) => p.isConfigured).length;
  const pending = projects.filter((p) => !p.isConfigured).length;

  const stats = [
    {
      label: "Total projects",
      value: projects.length,
      icon: FolderGit2,
      color: "text-thunder-600 bg-thunder-50",
    },
    {
      label: "Ready to edit",
      value: configured,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Pending setup",
      value: pending,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">
            Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="page-description">
            Manage your Git-connected content projects.
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">{stat.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Recent projects</h2>
            <p className="text-sm text-muted">Your latest connected repositories.</p>
          </div>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1 text-sm font-medium text-thunder-600 hover:text-thunder-700"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
              <FolderGit2 className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted">
                Connect your first GitHub repository to get started.
              </p>
            </div>
            <Link href="/dashboard/projects/new">
              <Button>Connect repository</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={
                  project.isConfigured
                    ? `/dashboard/projects/${project.id}`
                    : `/dashboard/projects/${project.id}/setup`
                }
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-subtle"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-overlay">
                    <FolderGit2 className="h-5 w-5 text-muted" />
                  </div>
                  <div>
                    <p className="font-medium tracking-tight">{project.name}</p>
                    <p className="text-sm text-muted">{project.gitRepoFullName}</p>
                  </div>
                </div>
                <span
                  className={
                    project.isConfigured ? "badge badge-success" : "badge badge-warning"
                  }
                >
                  {project.isConfigured ? "Ready" : "Setup required"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}