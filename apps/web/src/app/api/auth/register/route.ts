import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@thunder/database";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const orgName = `${parsed.data.name}'s Workspace`;
    const orgSlug = slugify(orgName);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: `${orgSlug}-${createdUser.id.slice(-6)}`,
        },
      });

      await tx.membership.create({
        data: {
          userId: createdUser.id,
          organizationId: organization.id,
          role: "owner",
        },
      });

      return createdUser;
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}