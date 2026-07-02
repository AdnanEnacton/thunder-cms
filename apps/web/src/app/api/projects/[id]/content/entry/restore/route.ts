import { NextResponse } from "next/server";
import { getFileAtRef, getFileContent, commitFile } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";
import { prisma } from "@thunder/database";
import { z } from "zod";

const restoreSchema = z.object({
  path: z.string().min(1),
  commitSha: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const body = await request.json();
  const parsed = restoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { path, commitSha } = parsed.data;
  const { project, token, session } = result;
  const branch = getProjectBranch(project);
  const title = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? path;
  const message = `Restore: "${title}" from ${commitSha.slice(0, 7)}`;

  try {
    const { content } = await getFileAtRef(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      path,
      commitSha,
    );

    const current = await getFileContent(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      path,
      branch,
    );

    const newCommitSha = await commitFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      branch,
      path,
      content,
      message,
      current.sha,
    );

    const updated = await getFileContent(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      path,
      branch,
    );

    await prisma.activityLog.create({
      data: {
        action: "entry.updated",
        entityPath: path,
        commitSha: newCommitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ path, sha: updated.sha, commitSha: newCommitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to restore entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
