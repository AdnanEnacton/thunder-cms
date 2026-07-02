import { NextResponse } from "next/server";
import { prisma } from "@thunder/database";
import { requireProjectMember } from "@/lib/project-auth";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["owner", "editor"]),
});

// PATCH /api/projects/[id]/team/[memberId] — change role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const { session } = result;
  const roleError = await requireRole(session.user.id, id, "owner");
  if (roleError) return NextResponse.json({ error: roleError }, { status: 403 });

  // Prevent self-demotion
  if (memberId === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { project } = result;
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: memberId,
        organizationId: project.organizationId,
      },
    },
  });

  if (!membership) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({ membership: updated });
}

// DELETE /api/projects/[id]/team/[memberId] — remove member
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const { session, project } = result;
  const roleError = await requireRole(session.user.id, id, "owner");
  if (roleError) return NextResponse.json({ error: roleError }, { status: 403 });

  if (memberId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: memberId,
        organizationId: project.organizationId,
      },
    },
  });

  if (!membership) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await prisma.membership.delete({ where: { id: membership.id } });

  return NextResponse.json({ success: true });
}
