import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { prisma } from "@thunder/database";
import { syncOrgGithubTokenForUser } from "@/lib/org-github";
import { slugify } from "@/lib/utils";

async function syncGithubAccountToken(account: {
  providerId: string;
  userId: string;
}) {
  if (account.providerId !== "github") return;
  try {
    // account.accessToken is encrypted at rest (encryptOAuthTokens), so read the
    // decrypted value back through better-auth's own API.
    const result = await authInstance.api.getAccessToken({
      body: { providerId: "github", userId: account.userId },
    });
    if (result?.accessToken) {
      await syncOrgGithubTokenForUser(account.userId, result.accessToken);
    }
  } catch {
    // Best-effort: resolveOrgGithubToken() backfills on demand if this fails.
  }
}

export const authInstance = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  account: {
    // Encrypt OAuth access/refresh tokens at rest in the Account table.
    encryptOAuthTokens: true,
  },
  socialProviders: {
    github: {
      clientId: (process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID)!,
      clientSecret: (process.env.AUTH_GITHUB_SECRET ??
        process.env.GITHUB_CLIENT_SECRET)!,
      // `repo` is required so the CMS can read/write the connected repository.
      scope: ["read:user", "user:email", "repo"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Bootstrap a personal workspace + owner membership for every new user
          // (covers both email/password sign-up and first GitHub sign-in).
          const existing = await prisma.membership.findFirst({
            where: { userId: user.id },
          });
          if (existing) return;

          const displayName =
            user.name || user.email?.split("@")[0] || "User";
          const orgName = `${displayName}'s Workspace`;

          await prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
              data: {
                name: orgName,
                slug: `${slugify(orgName)}-${user.id.slice(-6)}`,
              },
            });

            await tx.membership.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                role: "owner",
              },
            });
          });
        },
      },
    },
    account: {
      // Persist the GitHub OAuth token onto the user's owned org(s) so the CMS
      // can act on their behalf against the GitHub API. Runs on first link
      // (create) and on every subsequent GitHub sign-in (update).
      create: { after: syncGithubAccountToken },
      update: { after: syncGithubAccountToken },
    },
  },
  plugins: [nextCookies()],
});

/**
 * Returns the current session (`{ user, session }`) or `null`.
 * Named `auth()` for back-compat with the previous NextAuth server helper, so
 * existing `const session = await auth()` call sites keep working.
 */
export async function auth() {
  return authInstance.api.getSession({ headers: await headers() });
}
