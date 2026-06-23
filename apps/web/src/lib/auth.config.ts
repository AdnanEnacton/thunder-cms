import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }

      if (token.githubAccessToken) {
        session.githubAccessToken = token.githubAccessToken as string;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;