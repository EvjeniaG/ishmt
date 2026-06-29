import "dotenv/config";
import { OrgType, PrismaClient } from "@prisma/client";
import { displayOmBody, normalizeOmBodyOrganizationName } from "../src/lib/elevators/format-om-body";

const prisma = new PrismaClient();

async function main() {
  const certifiers = await prisma.organization.findMany({
    where: { type: OrgType.CERTIFIER, deletedAt: null },
    select: { id: true, name: true },
  });

  let updated = 0;
  for (const org of certifiers) {
    const normalized = normalizeOmBodyOrganizationName(org.name);
    if (normalized) {
      await prisma.organization.update({ where: { id: org.id }, data: { name: normalized } });
      console.log(`  ${org.name} → ${normalized}`);
      updated++;
    }
  }

  console.log(`\nPërfundoi: ${updated} organizata u normalizuan.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
