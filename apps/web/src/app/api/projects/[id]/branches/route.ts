import { NextResponse } from "next/server";
import { listBranches, createBranch } from "@/lib/github";
import { getProjectForUser, getProjectBranch } from "@/lib/project-auth";
import { prisma } from "@thunder/database";
import { z } from "zod";

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

  const { project, token, membership } = result;

  try {
    const branches = await listBranches(
      token,
      project.gitRepoOwner!,
      project.gitRepoName!,
    );

    const marked = branches.map((b) => ({
      ...b,
      isDefault: b.name === project.defaultBranch,
      isTarget: b.name === (project.targetBranch ?? project.defaultBranch),
    }));

    return NextResponse.json({
      branches: marked,
      defaultBranch: project.defaultBranch,
      targetBranch: project.targetBranch ?? project.defaultBranch,
      canManage: membership.role === "owner",
    });
  } catch {
    return NextResponse.json({ error: "Failed to list branches" }, { status: 500 });
  }
}

const putSchema = z.object({
  branch: z.string().nullable(),
  createIfMissing: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectForUser(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : result.error === "Not found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { project, token, membership } = result;

  if (membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can change target branch" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = putSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const branchName = parsed.data.branch === "" ? null : parsed.data.branch;

  if (parsed.data.createIfMissing && branchName) {
    try {
      await createBranch(
        token,
        project.gitRepoOwner!,
        project.gitRepoName!,
        parsed.data.createIfMissing,
        project.defaultBranch,
      );
    } catch {
      // branch likely already exists; ignore
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { targetBranch: branchName ?? null },
  });

  return NextResponse.json({
    targetBranch: updated.targetBranch ?? updated.defaultBranch,
  });
}
