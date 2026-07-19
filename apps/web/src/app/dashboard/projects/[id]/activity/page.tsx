import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import {
  FileEdit,
  FilePlus,
  FileX,
  Image,
  Settings,
  Upload,
  Trash2,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSubpageLayout } from "@/components/project/project-subpage-layout";

const ACTION_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  "entry.created":     { label: "Created",       icon: FilePlus,  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
  "entry.updated":     { label: "Updated",        icon: FileEdit,  color: "text-thunder-600 bg-thunder-50 dark:bg-thunder-500/10 dark:text-thunder-400" },
  "entry.deleted":     { label: "Deleted",        icon: FileX,     color: "text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
  "media.uploaded":    { label: "Media uploaded", icon: Upload,    color: "text-stone-600 bg-stone-100 dark:bg-stone-500/10 dark:text-stone-300" },
  "media.deleted":     { label: "Media deleted",  icon: Trash2,    color: "text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
  "project.configured":{ label: "Configured",     icon: Settings,  color: "text-thunder-500 bg-thunder-50 dark:bg-thunder-500/10 dark:text-thunder-400" },
  "config.updated":    { label: "Config updated", icon: Settings,  color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400" },
};

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ActivityPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) redirect("/dashboard");

  const logs = await prisma.activityLog.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const userInitial = (user: { name?: string | null; email?: string | null }) =>
    user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <ProjectSubpageLayout projectId={id} projectName={project.name} user={session?.user}>
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <div className="page-header">
        <h1 className="page-title">Activity log</h1>
        <p className="page-description">
          Every save, upload, and configuration change for{" "}
          <strong>{project.name}</strong>.
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-overlay">
              <Activity className="h-6 w-6 text-muted" />
            </div>
            <p className="font-medium">No activity yet</p>
            <p className="text-sm text-muted">
              Actions on content, media, and settings will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>{logs.length} events recorded</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const meta = ACTION_META[log.action] ?? {
                  label: log.action,
                  icon: Activity,
                  color: "text-muted bg-surface-overlay",
                };
                const Icon = meta.icon;

                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{meta.label}</span>
                        {log.entityPath && (
                          <code className="rounded bg-surface-overlay px-1.5 py-0.5 text-xs text-muted font-mono truncate max-w-[300px]">
                            {log.entityPath}
                          </code>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        {/* Avatar */}
                        {log.user.image ? (
                          <img
                            src={log.user.image}
                            alt=""
                            className="h-4 w-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-thunder-100 text-[9px] font-bold text-thunder-700">
                            {userInitial(log.user)}
                          </div>
                        )}
                        <span>{log.user.name ?? log.user.email}</span>
                        <span>·</span>
                        <span title={new Date(log.createdAt).toLocaleString()}>
                          {timeAgo(new Date(log.createdAt))}
                        </span>
                        {log.commitSha && (
                          <>
                            <span>·</span>
                            <code className="font-mono">{log.commitSha.slice(0, 7)}</code>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </ProjectSubpageLayout>
  );
}
