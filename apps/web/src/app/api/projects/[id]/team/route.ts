import { NextResponse } from "next/server";
import { prisma } from "@thunder/database";
import { requireProjectMember } from "@/lib/project-auth";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

// GET /api/projects/[id]/team — list members + pending invitations
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

  const { project } = result;

  const memberships = await prisma.membership.findMany({
    where: { organizationId: project.organizationId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: project.organizationId,
      accepted: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ memberships, invitations });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "editor"]).default("editor"),
});

// POST /api/projects/[id]/team — invite a member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { session, project } = result;

  // Only owners can invite
  const roleError = await requireRole(session.user.id, id, "owner");
  if (roleError) {
    return NextResponse.json({ error: roleError }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, role } = parsed.data;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId: project.organizationId,
        },
      },
    });
    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }
  }

  // Upsert invitation (reset token + expiry if re-inviting)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.upsert({
    where: {
      email_organizationId: {
        email,
        organizationId: project.organizationId,
      },
    },
    update: {
      role,
      token: crypto.randomUUID(),
      accepted: false,
      expiresAt,
      invitedById: session.user.id,
    },
    create: {
      email,
      role,
      organizationId: project.organizationId,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  // In production you'd send an email here. For now return the invite link.
  const inviteUrl = `${process.env.AUTH_URL}/invite/${invitation.token}`;

  return NextResponse.json({ invitation, inviteUrl });
}
