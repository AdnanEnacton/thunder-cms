import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const project = await prisma.project.findFirst({
  where: { name: "thunder-test" },
  select: { id: true, name: true, componentsRoot: true, blockRegistry: true },
});
console.log("name:", project?.name);
console.log("componentsRoot:", project?.componentsRoot);
const blocks = project?.blockRegistry ? JSON.parse(project.blockRegistry) : [];
console.log("block count:", blocks.length);
console.log("keys:", blocks.map((b) => b.key));
await prisma.$disconnect();
