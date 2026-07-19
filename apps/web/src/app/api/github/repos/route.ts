import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUserRepos } from "@/lib/github";
import { getGithubTokenForUser } from "@/lib/github-token";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getGithubTokenForUser(session.user.id);

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