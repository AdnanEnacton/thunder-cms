import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectMember } from "@/lib/project-auth";
import { prisma } from "@thunder/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { project, membership } = result;

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      targetBranch: project.targetBranch ?? project.defaultBranch,
      defaultBranch: project.defaultBranch,
      previewUrl: project.previewUrl,
      commitMessageMode: project.commitMessageMode,
    },
    role: membership.role,
  });
}

const patchSchema = z.object({
  targetBranch: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  commitMessageMode: z.enum(["auto", "custom"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (result.membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can change project settings" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.targetBranch !== undefined) {
    data.targetBranch = parsed.data.targetBranch === "" ? null : parsed.data.targetBranch;
  }
  if (parsed.data.previewUrl !== undefined) {
    data.previewUrl = parsed.data.previewUrl === "" ? null : parsed.data.previewUrl;
  }
  if (parsed.data.commitMessageMode !== undefined) {
    data.commitMessageMode = parsed.data.commitMessageMode;
  }

  const updated = await prisma.project.update({ where: { id }, data });

  return NextResponse.json({
    project: {
      id: updated.id,
      targetBranch: updated.targetBranch,
      previewUrl: updated.previewUrl,
      commitMessageMode: updated.commitMessageMode,
      defaultBranch: updated.defaultBranch,
    },
  });
}
