import { prisma } from "@thunder/database";
import { getGithubTokenForUser } from "@/lib/github-token";

/** Persist a GitHub token on every org the user owns. */
export async function syncOrgGithubTokenForUser(userId: string, accessToken: string) {
  const ownerMemberships = await prisma.membership.findMany({
    where: { userId, role: "owner" },
    select: { organizationId: true },
  });

  if (ownerMemberships.length === 0) return;

  await prisma.organization.updateMany({
    where: { id: { in: ownerMemberships.map((m) => m.organizationId) } },
    data: {
      githubAccessToken: accessToken,
      githubConnectedAt: new Date(),
      githubConnectedById: userId,
    },
  });
}

/**
 * Resolve the GitHub token for an org. Uses the stored org token when present;
 * otherwise backfills from the project owner or any org owner account.
 */
export async function resolveOrgGithubToken(
  organizationId: string,
  projectOwnerId?: string,
): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { githubAccessToken: true },
  });

  if (org?.githubAccessToken) return org.githubAccessToken;

  const candidateUserIds: string[] = [];
  if (projectOwnerId) candidateUserIds.push(projectOwnerId);

  const orgOwners = await prisma.membership.findMany({
    where: { organizationId, role: "owner" },
    select: { userId: true },
  });

  for (const { userId } of orgOwners) {
    if (!candidateUserIds.includes(userId)) candidateUserIds.push(userId);
  }

  for (const userId of candidateUserIds) {
    const token = await getGithubTokenForUser(userId);
    if (!token) continue;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        githubAccessToken: token,
        githubConnectedAt: new Date(),
        githubConnectedById: userId,
      },
    });

    return token;
  }

  return null;
}