import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const ASSEMBLY_EMAIL = "asamble.demo@example.al";
const ASSEMBLY_NID = "I90404005E";

async function main() {
  const prisma = new PrismaClient();

  const user = await prisma.authUser.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: ASSEMBLY_EMAIL }, { nid: ASSEMBLY_NID }],
    },
    include: {
      memberships: {
        where: { deactivatedAt: null },
        include: { organization: true },
      },
    },
  });

  if (user) {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.orgMembership.updateMany({
      where: { userId: user.id, deactivatedAt: null },
      data: { deactivatedAt: new Date() },
    });

    for (const membership of user.memberships) {
      const otherMembers = await prisma.orgMembership.count({
        where: {
          organizationId: membership.organizationId,
          deactivatedAt: null,
          userId: { not: user.id },
        },
      });
      if (otherMembers === 0 && membership.organization.type === "OWNER") {
        await prisma.organization.update({
          where: { id: membership.organizationId },
          data: { deletedAt: new Date() },
        });
      }
    }

    await prisma.authUser.update({
      where: { id: user.id },
      data: { isActive: false, deletedAt: new Date(), nid: null, email: `deleted+${user.id}@removed.local` },
    });
    console.log(`✓ U hoq përdoruesi ${ASSEMBLY_EMAIL}`);
  } else {
    console.log("⊘ Përdoruesi asamble nuk u gjet (tashmë i fshirë).");
  }

  const updatedOrgs = await prisma.$executeRawUnsafe(`
    UPDATE org_organizations
    SET owner_building_role = 'ADMINISTRATOR'
    WHERE owner_building_role::text = 'OWNERS_ASSEMBLY_REP';
  `);
  if (Number(updatedOrgs) > 0) {
    console.log(`✓ ${updatedOrgs} organizata u kaluan nga asamble në administrator`);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE app_application_data
    SET registration_extended_data = jsonb_set(
      registration_extended_data,
      '{responsibleEntityType}',
      '"ADMINISTRATOR"'
    )
    WHERE registration_extended_data->>'responsibleEntityType' = 'OWNERS_ASSEMBLY';
  `);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
