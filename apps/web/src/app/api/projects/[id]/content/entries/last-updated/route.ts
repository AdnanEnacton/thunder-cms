import { NextResponse } from "next/server";
import { prisma } from "@thunder/database";
import { requireProjectMember } from "@/lib/project-auth";

const TRACKED_ACTIONS = ["entry.updated", "entry.created"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const { searchParams } = new URL(request.url);
  const paths = (searchParams.get("paths") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (paths.length === 0) {
    return NextResponse.json({ items: {} });
  }

  const logs = await prisma.activityLog.findMany({
    where: { projectId: id, entityPath: { in: paths }, action: { in: TRACKED_ACTIONS } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const items: Record<
    string,
    { userName: string; userEmail: string; at: string; action: string }
  > = {};

  for (const log of logs) {
    if (!log.entityPath || items[log.entityPath]) continue; // desc order → first hit wins
    items[log.entityPath] = {
      userName: log.user.name || log.user.email,
      userEmail: log.user.email,
      at: log.createdAt.toISOString(),
      action: log.action,
    };
  }

  return NextResponse.json({ items });
}
