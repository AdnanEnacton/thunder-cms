import { NextResponse } from "next/server";
import { getRepoTree } from "@/lib/github";
import { getConfigPaths, listConfigFiles } from "@/lib/config/scan";
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
  const configPaths = getConfigPaths(project.configPaths);

  if (configPaths.length === 0) {
    return NextResponse.json({ files: [], configPaths: [] });
  }

  try {
    const tree = await getRepoTree(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
      project.defaultBranch,
    );

    return NextResponse.json({
      configPaths,
      files: listConfigFiles(tree, configPaths),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load config files" }, { status: 500 });
  }
}