import { NextResponse } from "next/server";
import { prisma } from "@thunder/database";
import { requireProjectMember } from "@/lib/project-auth";
import { requireRole } from "@/lib/rbac";

// DELETE /api/projects/[id]/team/invitations/[token] — revoke invite
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; token: string }> },
) {
  const { id, token } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const { session } = result;
  const roleError = await requireRole(session.user.id, id, "owner");
  if (roleError) return NextResponse.json({ error: roleError }, { status: 403 });

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  await prisma.invitation.delete({ where: { token } });
  return NextResponse.json({ success: true });
}
