import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectMember } from "@/lib/project-auth";
import {
  parseBlockRegistry,
  parsePageTypes,
  serializeBlockRegistry,
  serializePageTypes,
} from "@/lib/blocks/registry";
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

  const { project } = result;

  return NextResponse.json({
    blocks: parseBlockRegistry(project.blockRegistry),
    pageTypes: parsePageTypes(project.pageTypes),
  });
}

// Fields are validated loosely — the schema is user-authored and intentionally
// open-ended (nested `fields`/`of` recurse arbitrarily), so we accept any object
// shape as long as the load-bearing identity fields are present and typed.
const blockFieldDefSchema: z.ZodType = z.lazy(() =>
  z
    .object({
      name: z.string().min(1),
      label: z.string(),
      type: z.string(),
    })
    .passthrough(),
);

const blockDefSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    fields: z.array(blockFieldDefSchema),
  })
  .passthrough();

const pageTypeDefSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
  })
  .passthrough();

const putSchema = z.object({
  blocks: z.array(blockDefSchema).optional(),
  pageTypes: z.array(pageTypeDefSchema).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireProjectMember(id);

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registry payload" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (parsed.data.blocks !== undefined) {
    data.blockRegistry = serializeBlockRegistry(parsed.data.blocks as never);
  }
  if (parsed.data.pageTypes !== undefined) {
    data.pageTypes = serializePageTypes(parsed.data.pageTypes as never);
  }

  const updated = await prisma.project.update({ where: { id }, data });

  return NextResponse.json({
    blocks: parseBlockRegistry(updated.blockRegistry),
    pageTypes: parsePageTypes(updated.pageTypes),
  });
}
