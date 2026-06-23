import { NextResponse } from "next/server";
import type { ThunderConfig } from "@thunder/types";
import { auth } from "@/lib/auth";
import { commitThunderConfig } from "@/lib/github";
import { prisma } from "@thunder/database";
import { z } from "zod";

const configureSchema = z.object({
  contentRoot: z.string().min(1),
  mediaRoot: z.string().min(1),
  mediaPublic: z.string().min(1),
  codeRoot: z.string().optional(),
  configPaths: z.array(z.string()).optional(),
  commitMessageMode: z.enum(["auto", "custom"]).default("auto"),
});

async function getGithubToken(userId: string, sessionToken?: string) {
  if (sessionToken) return sessionToken;

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });

  return account?.access_token ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = configureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || !project.gitRepoOwner || !project.gitRepoName) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const token = await getGithubToken(session.user.id, session.githubAccessToken);

  if (!token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 403 });
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

  try {
    const commitSha = await commitThunderConfig(
      token,
      project.gitRepoOwner,
      project.gitRepoName,
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