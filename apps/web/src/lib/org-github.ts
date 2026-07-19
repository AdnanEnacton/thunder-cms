import { prisma } from "@thunder/database";
import { getGithubTokenForUser } from "@/lib/github-token";
import { encryptToken, decryptToken } from "@/lib/token-crypto";

/** Persist a GitHub token (encrypted at rest) on every org the user owns. */
export async function syncOrgGithubTokenForUser(userId: string, accessToken: string) {
  const ownerMemberships = await prisma.membership.findMany({
    where: { userId, role: "owner" },
    select: { organizationId: true },
  });

  if (ownerMemberships.length === 0) return;

  const encrypted = await encryptToken(accessToken);

  await prisma.organization.updateMany({
    where: { id: { in: ownerMemberships.map((m) => m.organizationId) } },
    data: {
      githubAccessToken: encrypted,
      githubConnectedAt: new Date(),
      githubConnectedById: userId,
    },
  });
}

/**
 * Resolve the GitHub token (plaintext) for an org. Uses the stored org token
 * when present; otherwise backfills from the project owner or any org owner
 * account. The stored value is encrypted; the returned value is decrypted.
 */
export async function resolveOrgGithubToken(
  organizationId: string,
  projectOwnerId?: string,
): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { githubAccessToken: true },
  });

  if (org?.githubAccessToken) {
    const decrypted = await decryptToken(org.githubAccessToken);
    if (decrypted) return decrypted;
  }

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
        githubAccessToken: await encryptToken(token),
        githubConnectedAt: new Date(),
        githubConnectedById: userId,
      },
    });

    return token;
  }

  return null;
}
