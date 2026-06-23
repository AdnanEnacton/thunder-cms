import { NextResponse } from "next/server";
import { commitBinaryFile, deleteFile, getRepoTree } from "@/lib/github";
import { getMediaFolders, listMediaFiles } from "@/lib/media/scan";
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

  const { project, token } = result;

  if (!project.mediaRoot || !project.mediaPublic) {
    return NextResponse.json({ error: "Media paths not configured" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") ?? "";

  try {
    const tree = await getRepoTree(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
    );

    return NextResponse.json({
      mediaRoot: project.mediaRoot,
      mediaPublic: project.mediaPublic,
      folder,
      folders: getMediaFolders(tree, project.mediaRoot),
      files: listMediaFiles(tree, project.mediaRoot, project.mediaPublic, folder),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load media library" }, { status: 500 });
  }
}

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

  const { project, token, session } = result;

  if (!project.mediaRoot) {
    return NextResponse.json({ error: "Media root not configured" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = folder
    ? `${project.mediaRoot}/${folder}/${safeName}`
    : `${project.mediaRoot}/${safeName}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const commitSha = await commitBinaryFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
      path,
      buffer,
      `Upload: "${safeName}"`,
    );

    await prisma.activityLog.create({
      data: {
        action: "media.uploaded",
        entityPath: path,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ path, commitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to upload file";
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
  const name = path.split("/").pop() ?? path;

  try {
    const commitSha = await deleteFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
      path,
      `Delete media: "${name}"`,
    );

    await prisma.activityLog.create({
      data: {
        action: "media.deleted",
        entityPath: path,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ commitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete file";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}