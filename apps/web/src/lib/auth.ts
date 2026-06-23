import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@thunder/database";
import { authConfig } from "@/lib/auth.config";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "github" || !user.id) return;

      const existingMembership = await prisma.membership.findFirst({
        where: { userId: user.id },
      });

      if (existingMembership) return;

      const displayName = user.name ?? user.email?.split("@")[0] ?? "User";
      const orgName = `${displayName}'s Workspace`;

      await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: orgName,
            slug: `${slugify(orgName)}-${user.id!.slice(-6)}`,
          },
        });

        await tx.membership.create({
          data: {
            userId: user.id!,
            organizationId: organization.id,
            role: "owner",
          },
        });
      });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (account?.provider === "github" && account.access_token) {
        token.githubAccessToken = account.access_token;
      } else if (token.id && !token.githubAccessToken) {
        const githubAccount = await prisma.account.findFirst({
          where: { userId: token.id as string, provider: "github" },
        });

        if (githubAccount?.access_token) {
          token.githubAccessToken = githubAccount.access_token;
        }
      }

      return token;
    },
  },
});