import { NextResponse } from "next/server";
import { listCommitsForFile } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const { project, token } = result;
  const branch = getProjectBranch(project);

  try {
    const commits = await listCommitsForFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      branch,
      path,
    );

    return NextResponse.json({ commits });
  } catch {
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
