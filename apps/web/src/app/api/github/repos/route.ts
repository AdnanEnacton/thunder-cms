import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUserRepos } from "@/lib/github";
import { prisma } from "@thunder/database";

async function getGithubToken(userId: string, sessionToken?: string) {
  if (sessionToken) return sessionToken;

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });

  return account?.access_token ?? null;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getGithubToken(session.user.id, session.githubAccessToken);

  if (!token) {
    return NextResponse.json(
      { error: "GitHub not connected. Sign in with GitHub to list repositories." },
      { status: 403 },
    );
  }

  try {
    const repos = await listUserRepos(token);
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
}