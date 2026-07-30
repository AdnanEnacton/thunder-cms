import { NextResponse } from "next/server";
import { getLatestDeploymentStatus } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";

/**
 * Latest deployment status for the project's active branch. Reads GitHub's
 * Deployments / commit-status data that Vercel, Netlify, etc. publish, so no
 * per-provider integration or webhook receiver is required.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { project, token } = result;
  const branch = getProjectBranch(project);

  try {
    const deployment = await getLatestDeploymentStatus(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      branch,
    );
    return NextResponse.json({ branch, deployment });
  } catch {
    return NextResponse.json({ error: "Failed to load deployment status" }, { status: 500 });
  }
}
