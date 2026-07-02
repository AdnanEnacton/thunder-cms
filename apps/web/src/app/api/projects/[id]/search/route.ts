import { NextResponse } from "next/server";
import { getFileContent, getRepoTree } from "@/lib/github";
import { getContentRoots } from "@/lib/content/scan";
import { isContentFile, parseContentFile } from "@/lib/content/parser";
import { getEntryTitle, isDraft } from "@/lib/content/schema";
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
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ entries: [] });
  }

  const { project, token } = result;
  const roots = getContentRoots(project.contentRoots);

  if (roots.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const branch = getProjectBranch(project);

  try {
    const tree = await getRepoTree(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      branch,
    );

    const candidatePaths: string[] = [];
    for (const root of roots) {
      const prefix = `${root.path}/`;
      for (const entry of tree) {
        if (entry.type === "file" && entry.path.startsWith(prefix) && isContentFile(entry.path)) {
          candidatePaths.push(entry.path);
        }
      }
    }

    const matches: Array<{
      path: string;
      title: string;
      draft: boolean;
      collectionId: string;
    }> = [];

    const batchSize = 8;
    for (let i = 0; i < candidatePaths.length && matches.length < 20; i += batchSize) {
      const batch = candidatePaths.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (path) => {
          try {
            const { content } = await getFileContent(
              token,
              project.gitRepoOwner!,
              project.gitRepoName!,
              path,
              branch,
            );
            const { frontmatter } = parseContentFile(path, content);
            const title = getEntryTitle(frontmatter, path);
            return { path, title, frontmatter };
          } catch {
            return null;
          }
        }),
      );

      for (const r of results) {
        if (!r) continue;
        if (
          r.title.toLowerCase().includes(q) ||
          r.path.toLowerCase().includes(q)
        ) {
          const root = roots.find((root) => r.path.startsWith(`${root.path}/`));
          matches.push({
            path: r.path,
            title: r.title,
            draft: isDraft(r.frontmatter),
            collectionId: root?.id ?? "",
          });
        }
      }
    }

    return NextResponse.json({ entries: matches.slice(0, 20) });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
