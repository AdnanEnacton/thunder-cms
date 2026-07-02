import type { Membership, Project } from "@thunder/database";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { resolveOrgGithubToken } from "@/lib/org-github";
import { prisma } from "@thunder/database";

export { getGithubTokenForUser } from "@/lib/github-token";

type ProjectAuthError = {
  error: "Unauthorized" | "Not found" | "GitHub not connected";
};

type ProjectMemberSuccess = {
  session: Session;
  project: Project;
  membership: Membership;
};

type ProjectGitSuccess = {
  session: Session;
  project: Project;
  token: string;
};

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

/** Membership-only check — no GitHub token required. */
export async function requireProjectMember(
  projectId: string,
): Promise<ProjectMemberSuccess | ProjectAuthError> {
  const session = await getSessionUser();
  if (!session) return { error: "Unauthorized" };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Not found" };

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: project.organizationId,
      },
    },
  });
  if (!membership) return { error: "Unauthorized" };

  return { session, project, membership };
}

export async function getProjectForUser(
  projectId: string,
): Promise<ProjectGitSuccess | ProjectAuthError> {
  const memberResult = await requireProjectMember(projectId);
  if ("error" in memberResult) return memberResult;

  const { session, project } = memberResult;

  if (!project.gitRepoOwner || !project.gitRepoName) {
    return { error: "Not found" };
  }

  const token = await resolveOrgGithubToken(project.organizationId, project.ownerId);
  if (!token) {
    return { error: "GitHub not connected" };
  }

  return { session, project, token };
}