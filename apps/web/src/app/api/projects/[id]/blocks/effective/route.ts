import { NextResponse } from "next/server";
import type { GitFramework } from "@thunder/types";
import { getFileContent, getRepoTree } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";
import { defaultComponentsRoot } from "@/lib/framework";
import { isComponentFile } from "@/lib/blocks/discover";
import { buildDiscoveredBlocks, mergeEffectiveBlocks, resolveConfigDrivenBlocks } from "@/lib/blocks/effective";
import { parseBlockRegistry, parsePageTypes } from "@/lib/blocks/registry";
import type { LockfileFile } from "@/lib/blocks/npm-manifest";

const MAX_FILES = 120;
const LOCKFILE_NAMES: LockfileFile["name"][] = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"];

async function readRepoFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string | null> {
  try {
    const { content } = await getFileContent(token, owner, repo, path, branch);
    return content;
  } catch {
    return null;
  }
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
  const componentsRoot =
    project.componentsRoot?.trim() ||
    defaultComponentsRoot(project.framework as GitFramework | null);
  const overrides = parseBlockRegistry(project.blockRegistry);
  const pageTypes = parsePageTypes(project.pageTypes);
  const owner = project.gitRepoOwner!;
  const repo = project.gitRepoName!;
  const branch = getProjectBranch(project);

  const thunderConfigSource = await readRepoFile(token, owner, repo, "thunder.config.ts", branch);

  if (thunderConfigSource) {
    const packageJsonSource = await readRepoFile(token, owner, repo, "package.json", branch);
    let lockfile: LockfileFile | null = null;
    for (const name of LOCKFILE_NAMES) {
      const source = await readRepoFile(token, owner, repo, name, branch);
      if (source) {
        lockfile = { name, source };
        break;
      }
    }

    const configResult = await resolveConfigDrivenBlocks(thunderConfigSource, {
      packageJsonSource,
      lockfile,
      readLocalFile: (path) => readRepoFile(token, owner, repo, path, branch),
    });

    return NextResponse.json({
      blocks: configResult.blocks,
      overrides,
      pageTypes: configResult.pageTypes.length ? configResult.pageTypes : pageTypes,
      componentsRoot,
      source: "config",
      warnings: configResult.warnings,
    });
  }

  try {
    const tree = await getRepoTree(token, owner, repo, branch);

    const componentPaths = tree
      .filter(
        (entry) =>
          entry.type === "file" &&
          (entry.path.startsWith(`${componentsRoot}/`) || entry.path === componentsRoot) &&
          isComponentFile(entry.path),
      )
      .map((entry) => entry.path);

    const truncated = componentPaths.length > MAX_FILES;
    const paths = componentPaths.slice(0, MAX_FILES);

    const files: { path: string; content: string }[] = [];
    const batchSize = 8;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const fetched = await Promise.all(
        batch.map(async (path) => {
          const content = await readRepoFile(token, owner, repo, path, branch);
          return content !== null ? { path, content } : null;
        }),
      );
      for (const f of fetched) if (f) files.push(f);
    }

    const discovered = buildDiscoveredBlocks(files, componentsRoot);
    const blocks = mergeEffectiveBlocks(discovered, overrides);

    return NextResponse.json({
      blocks,
      overrides,
      pageTypes,
      componentsRoot,
      source: "folder-scan",
      discoveredCount: discovered.length,
      componentFileCount: componentPaths.length,
      truncated,
    });
  } catch {
    // Folder may not exist yet — fall back to the registry-only blocks so the
    // builder still works instead of erroring out.
    return NextResponse.json({
      blocks: overrides,
      overrides,
      pageTypes,
      componentsRoot,
      source: "folder-scan",
      discoveredCount: 0,
      componentFileCount: 0,
      truncated: false,
      warning: "Could not read the components folder — showing manual blocks only.",
    });
  }
}
