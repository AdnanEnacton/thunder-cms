import { prisma } from "@thunder/database";

export async function getGithubTokenForUser(userId: string, sessionToken?: string) {
  if (sessionToken) return sessionToken;

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });

  return account?.access_token ?? null;
}