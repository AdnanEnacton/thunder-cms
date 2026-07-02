import { NextResponse } from "next/server";
import { prisma } from "@thunder/database";
import { auth } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.accepted) {
    return NextResponse.json({ error: "Invitation already accepted" }, { status: 409 });
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  if (session.user.email !== invitation.email) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
  }

  // Check not already a member
  const existing = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: invitation.organizationId,
      },
    },
  });

  if (existing) {
    await prisma.invitation.update({ where: { token }, data: { accepted: true } });
    return NextResponse.json({ success: true });
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId: session.user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({ where: { token }, data: { accepted: true } }),
  ]);

  return NextResponse.json({ success: true });
}
