import { NextResponse } from "next/server";
import { z } from "zod";
import type { GitFramework } from "@thunder/types";
import { commitFile, getFileContent, getRepoTree } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";
import { defaultComponentsRoot } from "@/lib/framework";
import { generateThunderConfigTemplate } from "@/lib/blocks/config-template";
import { generateMigratedConfigSource } from "@/lib/blocks/migrate-to-config";
import { isComponentFile } from "@/lib/blocks/discover";
import { buildDiscoveredBlocks, mergeEffectiveBlocks } from "@/lib/blocks/effective";
import { parseBlockRegistry, parsePageTypes } from "@/lib/blocks/registry";
import { prisma } from "@thunder/database";

const CONFIG_PATH = "thunder.config.ts";
const MAX_FILES = 120;

async function resolveCurrentFolderScanBlocks(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  componentsRoot: string,
) {
  const tree = await getRepoTree(token, owner, repo, branch);
  const componentPaths = tree
    .filter(
      (entry) =>
        entry.type === "file" &&
        (entry.path.startsWith(`${componentsRoot}/`) || entry.path === componentsRoot) &&
        isComponentFile(entry.path),
    )
    .map((entry) => entry.path)
    .slice(0, MAX_FILES);

  const files: { path: string; content: string }[] = [];
  const batchSize = 8;
  for (let i = 0; i < componentPaths.length; i += batchSize) {
    const batch = componentPaths.slice(i, i + batchSize);
    const fetched = await Promise.all(
      batch.map(async (path) => {
        try {
          const { content } = await getFileContent(token, owner, repo, path, branch);
          return { path, content };
        } catch {
          return null;
        }
      }),
    );
    for (const f of fetched) if (f) files.push(f);
  }

  return buildDiscoveredBlocks(files, componentsRoot);
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

  const { project, token } = result;
  const branch = getProjectBranch(project);

  try {
    await getFileContent(token, project.gitRepoOwner!, project.gitRepoName!, CONFIG_PATH, branch);
    return NextResponse.json({ exists: true });
  } catch {
    return NextResponse.json({ exists: false, template: generateThunderConfigTemplate() });
  }
}

const postSchema = z.object({
  overwrite: z.boolean().optional(),
  mode: z.enum(["template", "migrate"]).optional(),
});

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

  const { session, project, token } = result;
  const branch = getProjectBranch(project);
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  const overwrite = parsed.success ? Boolean(parsed.data.overwrite) : false;
  const mode = parsed.success ? (parsed.data.mode ?? "template") : "template";

  const owner = project.gitRepoOwner!;
  const repo = project.gitRepoName!;

  let existingSha: string | undefined;
  try {
    const existing = await getFileContent(token, owner, repo, CONFIG_PATH, branch);
    if (!overwrite) {
      return NextResponse.json({ error: "thunder.config.ts already exists" }, { status: 409 });
    }
    existingSha = existing.sha;
  } catch {
    existingSha = undefined;
  }

  let source: string;
  let message: string;
  if (mode === "migrate") {
    const componentsRoot =
      project.componentsRoot?.trim() || defaultComponentsRoot(project.framework as GitFramework | null);
    try {
      const discovered = await resolveCurrentFolderScanBlocks(token, owner, repo, branch, componentsRoot);
      const overrides = parseBlockRegistry(project.blockRegistry);
      const blocks = mergeEffectiveBlocks(discovered, overrides);
      const pageTypes = parsePageTypes(project.pageTypes);
      source = generateMigratedConfigSource(blocks, pageTypes);
      message = "chore: migrate folder-scan blocks to thunder.config.ts";
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to read current blocks";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } else {
    source = generateThunderConfigTemplate();
    message = overwrite ? "chore: reset thunder.config.ts to the starter template" : "chore: add thunder.config.ts";
  }

  try {
    const commitSha = await commitFile(token, owner, repo, branch, CONFIG_PATH, source, message, existingSha);

    await prisma.activityLog.create({
      data: {
        action: "project.configured",
        entityPath: CONFIG_PATH,
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ commitSha });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to commit thunder.config.ts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
