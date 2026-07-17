/**
 * Migrim i të dhënave për reformën e workflow-it ISHMT.
 * Ekzekutoni: npx tsx scripts/migrate-ishmt-workflow.ts
 */
import { PrismaClient, ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const specialistRole = await prisma.authRole.findUnique({ where: { code: "SECTOR_SPECIALIST" } });
  const sectorHeadRole = await prisma.authRole.findUnique({ where: { code: "SECTOR_HEAD" } });

  if (specialistRole && sectorHeadRole) {
    const updated = await prisma.orgMembership.updateMany({
      where: { roleId: specialistRole.id },
      data: { roleId: sectorHeadRole.id },
    });
    console.log(`Anëtarësi specialist → përgjegjës sektori: ${updated.count}`);

    await prisma.authRolePermission.deleteMany({ where: { roleId: specialistRole.id } });
    await prisma.authRole.delete({ where: { id: specialistRole.id } });
    console.log("Roli SECTOR_SPECIALIST u fshi.");
  }

  const migratedApps = await prisma.application.updateMany({
    where: { status: ApplicationStatus.UNDER_REVIEW },
    data: { status: ApplicationStatus.PENDING_SECTOR_HEAD },
  });
  console.log(`Aplikime UNDER_REVIEW → PENDING_SECTOR_HEAD: ${migratedApps.count}`);

  const legacySpecialist = await prisma.authUser.findFirst({
    where: { email: "specialist@ishmt.gov.al" },
  });
  if (legacySpecialist) {
    await prisma.orgMembership.deleteMany({ where: { userId: legacySpecialist.id } });
    try {
      await prisma.authUser.delete({ where: { id: legacySpecialist.id } });
    } catch {
      await prisma.authUser.update({
        where: { id: legacySpecialist.id },
        data: { isActive: false, deletedAt: new Date(), nid: null },
      });
    }
    console.log("Përdoruesi legacy specialist@ishmt.gov.al u fshi.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
