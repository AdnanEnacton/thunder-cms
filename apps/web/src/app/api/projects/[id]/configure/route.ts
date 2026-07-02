import { NextResponse } from "next/server";
import type { ThunderConfig } from "@thunder/types";
import { commitThunderConfig } from "@/lib/github";
import { syncOrgGithubTokenForUser } from "@/lib/org-github";
import { getProjectForUser } from "@/lib/project-auth";
import { prisma } from "@thunder/database";
import { z } from "zod";

const configureSchema = z.object({
  contentRoot: z.string().min(1),
  mediaRoot: z.string().min(1),
  mediaPublic: z.string().min(1),
  codeRoot: z.string().optional(),
  configPaths: z.array(z.string()).optional(),
  commitMessageMode: z.enum(["auto", "custom"]).default("auto"),
  previewUrl: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status =
      result.error === "Unauthorized"
        ? 401
        : result.error === "GitHub not connected"
          ? 403
          : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { session, project, token } = result;

  const body = await request.json();
  const parsed = configureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (session.githubAccessToken) {
    await syncOrgGithubTokenForUser(session.user.id, session.githubAccessToken);
  }

  const contentRoots = [
    {
      id: "main",
      label: "Content",
      path: parsed.data.contentRoot,
    },
  ];

  const thunderConfig: ThunderConfig = {
    version: 1,
    framework: (project.framework as ThunderConfig["framework"]) ?? "unknown",
    content: { roots: contentRoots },
    media: {
      root: parsed.data.mediaRoot,
      publicPath: parsed.data.mediaPublic,
    },
    git: {
      defaultBranch: project.defaultBranch,
      commitMessageMode: parsed.data.commitMessageMode,
    },
  };

  if (parsed.data.codeRoot) {
    thunderConfig.code = { root: parsed.data.codeRoot };
  }

  if (parsed.data.configPaths?.length) {
    thunderConfig.configs = parsed.data.configPaths;
  }

  const { gitRepoOwner, gitRepoName } = project;

  try {
    const commitSha = await commitThunderConfig(
      token,
      gitRepoOwner!,
      gitRepoName!,
      project.defaultBranch,
      thunderConfig,
    );

    const updated = await prisma.project.update({
      where: { id },
      data: {
        isConfigured: true,
        contentRoots: JSON.stringify(contentRoots),
        mediaRoot: parsed.data.mediaRoot,
        mediaPublic: parsed.data.mediaPublic,
        codeRoot: parsed.data.codeRoot,
        configPaths: parsed.data.configPaths
          ? JSON.stringify(parsed.data.configPaths)
          : null,
        commitMessageMode: parsed.data.commitMessageMode,
        previewUrl: parsed.data.previewUrl || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "project.configured",
        entityPath: ".thunder/config.json",
        commitSha,
        userId: session.user.id,
        projectId: project.id,
      },
    });

    return NextResponse.json({ project: updated, commitSha });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}