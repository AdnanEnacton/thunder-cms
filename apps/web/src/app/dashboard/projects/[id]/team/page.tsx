import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { getUserRoleForProject } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamClient } from "./team-client";
import { ProjectSubpageLayout } from "@/components/project/project-subpage-layout";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, organizationId: true },
  });
  if (!project) redirect("/dashboard");

  const currentRole = await getUserRoleForProject(session.user.id, id);
  const isOwner = currentRole === "owner";

  const memberships = await prisma.membership.findMany({
    where: { organizationId: project.organizationId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: project.organizationId,
      accepted: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true, email: true } } },
  });

  return (
    <ProjectSubpageLayout projectId={id} projectName={project.name} user={session?.user}>
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        <div className="page-header">
          <h1 className="page-title">Team</h1>
          <p className="page-description">
            Members and pending invitations for <strong>{project.name}</strong>.
          </p>
        </div>

        <TeamClient
          projectId={id}
          currentUserId={session.user.id}
          isOwner={isOwner}
          initialMembers={memberships}
          initialInvitations={invitations.map((inv) => ({
            ...inv,
            expiresAt: inv.expiresAt.toISOString(),
          }))}
        />
      </div>
    </ProjectSubpageLayout>
  );
}
