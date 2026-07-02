import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const orgs = await prisma.organization.findMany({
  where: { githubAccessToken: null },
  include: {
    memberships: {
      where: { role: "owner" },
      select: { userId: true },
    },
  },
});

let updated = 0;

for (const org of orgs) {
  for (const { userId } of org.memberships) {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "github" },
      select: { access_token: true },
    });

    if (!account?.access_token) continue;

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        githubAccessToken: account.access_token,
        githubConnectedAt: new Date(),
        githubConnectedById: userId,
      },
    });

    console.log(`Backfilled org "${org.name}" from owner ${userId}`);
    updated++;
    break;
  }
}

console.log(`Done. Backfilled ${updated} of ${orgs.length} orgs without tokens.`);
await prisma.$disconnect();