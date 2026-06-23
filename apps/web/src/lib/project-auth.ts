import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function getGithubTokenForUser(userId: string, sessionToken?: string) {
  if (sessionToken) return sessionToken;

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });

  return account?.access_token ?? null;
}

export async function getProjectForUser(projectId: string) {
  const session = await getSessionUser();
  if (!session) return { error: "Unauthorized" as const };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !project.gitRepoOwner || !project.gitRepoName) {
    return { error: "Not found" as const };
  }

  const token = await getGithubTokenForUser(session.user.id, session.githubAccessToken);
  if (!token) {
    return { error: "GitHub not connected" as const };
  }

  return { session, project, token };
}