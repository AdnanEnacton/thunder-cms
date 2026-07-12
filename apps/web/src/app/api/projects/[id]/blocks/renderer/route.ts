import { NextResponse } from "next/server";
import { commitFile } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";
import { parseBlockRegistry } from "@/lib/blocks/registry";
import { generateRenderer } from "@/lib/blocks/render-gen";
import { defaultComponentsRoot } from "@/lib/framework";
import type { GitFramework } from "@thunder/types";
import { prisma } from "@thunder/database";

function buildRenderer(project: { framework: string | null; componentsRoot: string | null; blockRegistry: string | null }) {
  const componentsRoot =
    project.componentsRoot?.trim() || defaultComponentsRoot(project.framework as GitFramework | null);
  // Glob mode is folder-driven, so it renders every component whether or not the
  // block registry has entries. `blocks` is only used by the explicit fallback.
  const blocks = parseBlockRegistry(project.blockRegistry);
  return generateRenderer(project.framework as GitFramework | null, blocks, {
    mode: "glob",
    componentsRoot,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);
  if ("error" in result) {
    const status =
      result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(buildRenderer(result.project));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);
  if ("error" in result) {
    const status =
      result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { project, token, session } = result;
  const renderer = buildRenderer(project);
  const body = await request.json().catch(() => ({}));
  const path = typeof body?.path === "string" && body.path.trim() ? body.path.trim() : renderer.path;

  try {
    const commitSha = await commitFile(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      getProjectBranch(project),
      path,
      renderer.code,
      "chore: add Thunder blocks renderer",
    );

    await prisma.activityLog.create({
      data: {
        action: "renderer.generated",
        entityPath: path,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ path, commitSha });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to commit renderer";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
