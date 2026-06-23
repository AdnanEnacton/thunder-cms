import { NextResponse } from "next/server";
import { commitFile, deleteFile, getFileContent } from "@/lib/github";
import { parseContentFile, serializeContentFile } from "@/lib/content/parser";
import { inferFieldsFromEntries } from "@/lib/content/schema";
import { getProjectForUser } from "@/lib/project-auth";
import { prisma } from "@thunder/database";

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

  try {
    const { content, sha } = await getFileContent(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      path,
      project.defaultBranch,
    );

    const parsed = parseContentFile(path, content);
    const fields = inferFieldsFromEntries([parsed.frontmatter]);

    return NextResponse.json({
      path,
      sha,
      format: parsed.format,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      fields,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load entry" }, { status: 500 });
  }
}

export async function PUT(
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
  const { path, sha, frontmatter, body: entryBody, format = "md" } = body;

  if (!path || !sha) {
    return NextResponse.json({ error: "path and sha are required" }, { status: 400 });
  }

  const { project, token, session } = result;
  const title = frontmatter?.title ?? frontmatter?.name ?? path.split("/").pop();
  const message = `Update: "${title}"`;
  const content = serializeContentFile(format, frontmatter ?? {}, entryBody ?? "");

  try {
    const commitSha = await commitFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
      path,
      content,
      message,
      sha,
    );

    const updated = await getFileContent(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      path,
      project.defaultBranch,
    );

    await prisma.activityLog.create({
      data: {
        action: "entry.updated",
        entityPath: path,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ path, sha: updated.sha, commitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
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

  const { project, token, session } = result;
  const title = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? path;
  const message = `Delete: "${title}"`;

  try {
    const commitSha = await deleteFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
      path,
      message,
    );

    await prisma.activityLog.create({
      data: {
        action: "entry.deleted",
        entityPath: path,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ commitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}