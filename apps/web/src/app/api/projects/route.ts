import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@thunder/database";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1),
  gitRepoOwner: z.string().min(1),
  gitRepoName: z.string().min(1),
  gitRepoFullName: z.string().min(1),
  defaultBranch: z.string().default("main"),
  framework: z.string().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          projects: {
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });

  const projects = memberships.flatMap((m) => m.organization.projects);

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      gitRepoOwner: parsed.data.gitRepoOwner,
      gitRepoName: parsed.data.gitRepoName,
      gitRepoFullName: parsed.data.gitRepoFullName,
      defaultBranch: parsed.data.defaultBranch,
      framework: parsed.data.framework,
      ownerId: session.user.id,
      organizationId: membership.organizationId,
    },
  });

  return NextResponse.json({ project });
}