import { prisma } from "@thunder/database";

export type Role = "owner" | "editor";

/**
 * Returns the user's role in the organization that owns the given project.
 * Returns null if the user has no membership.
 */
export async function getUserRoleForProject(
  userId: string,
  projectId: string,
): Promise<Role | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });
  if (!project) return null;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: project.organizationId,
      },
    },
    select: { role: true },
  });

  return (membership?.role as Role) ?? null;
}

/** Throws-style helper — returns error string or null. */
export async function requireRole(
  userId: string,
  projectId: string,
  required: Role,
): Promise<string | null> {
  const role = await getUserRoleForProject(userId, projectId);
  if (!role) return "Unauthorized";
  if (required === "owner" && role !== "owner") return "Forbidden: owner only";
  return null;
}
