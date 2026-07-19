import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRepoTree } from "@/lib/github";
import { detectFramework } from "@/lib/framework";
import { getGithubTokenForUser } from "@/lib/github-token";
import { z } from "zod";

const querySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string().default("main"),
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getGithubTokenForUser(session.user.id);

  if (!token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    owner: searchParams.get("owner"),
    repo: searchParams.get("repo"),
    branch: searchParams.get("branch") ?? "main",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const tree = await getRepoTree(token, parsed.data.owner, parsed.data.repo, parsed.data.branch);
    const files = tree.filter((e) => e.type === "file").map((e) => e.path);
    const framework = detectFramework(files);

    return NextResponse.json({ tree, framework });
  } catch {
    return NextResponse.json({ error: "Failed to fetch repository tree" }, { status: 500 });
  }
}