import { NextResponse } from "next/server";
import { getRepoTree } from "@/lib/github";
import { buildScannedCollections, getContentRoots } from "@/lib/content/scan";
import { getProjectForUser } from "@/lib/project-auth";

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
  const roots = getContentRoots(project.contentRoots);

  try {
    const tree = await getRepoTree(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
    );

    const collections = roots.flatMap((root) => {
      const scanned = buildScannedCollections(root, tree);

      if (scanned.length > 0) {
        return scanned;
      }

      const rootPrefix = `${root.path}/`;
      const entryCount = tree.filter(
        (e) =>
          e.type === "file" &&
          e.path.startsWith(rootPrefix) &&
          /\.(md|mdx|json|ya?ml|toml)$/i.test(e.path),
      ).length;

      return [
        {
          id: root.id,
          label: root.label,
          rootId: root.id,
          rootPath: root.path,
          folderPath: null as string | null,
          group: null as string | null,
          entryCount,
        },
      ];
    });

    return NextResponse.json({ collections, roots });
  } catch {
    return NextResponse.json({ error: "Failed to scan content" }, { status: 500 });
  }
}