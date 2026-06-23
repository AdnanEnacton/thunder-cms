import { NextResponse } from "next/server";
import { getFileContent, getRepoTree } from "@/lib/github";
import {
  getContentRoots,
  listEntriesInCollection,
  summarizeEntry,
} from "@/lib/content/scan";
import { inferFieldsFromEntries } from "@/lib/content/schema";
import { parseContentFile } from "@/lib/content/parser";
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
  const rootId = searchParams.get("rootId");
  const folderPath = searchParams.get("folderPath") ?? searchParams.get("folder");

  const { project, token } = result;
  const roots = getContentRoots(project.contentRoots);
  const root = roots.find((r) => r.id === rootId) ?? roots[0];

  if (!root) {
    return NextResponse.json({ error: "No content root configured" }, { status: 400 });
  }

  try {
    const tree = await getRepoTree(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
    );

    const paths = listEntriesInCollection(root, tree, folderPath ?? undefined).slice(0, 100);
    const collectionId = folderPath
      ? `${root.id}--${folderPath.replace(/\//g, "--")}`
      : root.id;
    const batchSize = 8;
    const entries = [];
    const frontmatters: Array<Record<string, unknown>> = [];

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (path) => {
          try {
            const { content } = await getFileContent(
              token,
              project.gitRepoOwner!,
              project.gitRepoName!,
              path,
              project.defaultBranch,
            );
            return {
              summary: summarizeEntry(path, content, collectionId),
              frontmatter: parseContentFile(path, content).frontmatter,
            };
          } catch {
            return null;
          }
        }),
      );

      for (const result of results) {
        if (!result) continue;
        entries.push(result.summary);
        frontmatters.push(result.frontmatter);
      }
    }

    const fields = inferFieldsFromEntries(frontmatters);

    return NextResponse.json({ entries, fields, root, folderPath });
  } catch {
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });
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

  const body = await request.json();
  const { rootId, folderPath, folder, title, frontmatter = {}, body: entryBody = "" } = body;
  const resolvedFolderPath = folderPath ?? folder;

  if (!rootId || !title) {
    return NextResponse.json({ error: "rootId and title are required" }, { status: 400 });
  }

  const { project, token, session } = result;
  const roots = getContentRoots(project.contentRoots);
  const root = roots.find((r) => r.id === rootId);

  if (!root) {
    return NextResponse.json({ error: "Invalid content root" }, { status: 400 });
  }

  const slug = String(title)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const fileName = `${slug}.md`;
  const path = resolvedFolderPath
    ? `${root.path}/${resolvedFolderPath}/${fileName}`
    : `${root.path}/${fileName}`;

  const { serializeContentFile } = await import("@/lib/content/parser");
  const mergedFrontmatter = { ...frontmatter, title };
  const content = serializeContentFile("md", mergedFrontmatter, entryBody);
  const message = `Create: "${title}"`;

  try {
    const { commitFile } = await import("@/lib/github");
    const commitSha = await commitFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
      path,
      content,
      message,
    );

    await prisma.activityLog.create({
      data: {
        action: "entry.created",
        entityPath: path,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ path, commitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}