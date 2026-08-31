import type { PrismaClient } from "@prisma/client";
export {
  DEMO_OWNER_ADMINISTRATOR,
  DEMO_OWNER_PROFILES,
} from "../../src/lib/demo/demo-seed-profiles";
import {
  DEMO_OWNER_ADMINISTRATOR,
  DEMO_OWNER_PROFILES,
  type DemoOwnerSeedProfile,
} from "../../src/lib/demo/demo-seed-profiles";

/** Përdoruesi kanonik i personit përgjegjës në demo - i njëjti për seed-demo dhe hyrje me NID. */
export const DEMO_OWNER_NID = DEMO_OWNER_ADMINISTRATOR.nid;
export const DEMO_OWNER_EMAIL = DEMO_OWNER_ADMINISTRATOR.email;
export const DEMO_OWNER_ORG_NAME = DEMO_OWNER_ADMINISTRATOR.orgName;

const LEGACY_OWNER_EMAIL = "owner@example.al";
const LEGACY_DEMO_OWNER_EMAIL = "personi përgjegjës i ashensorit@example.al";
const LEGACY_OWNER_ORG_NAME = "Ndërtesa Shembull Sh.p.k.";
const LEGACY_OWNER_ORG_NAMES = [
  LEGACY_OWNER_ORG_NAME,
  "Personi Përgjegjës Shembull (Person Fizik)",
];

async function migrateLegacyOwnerOrg(
  prisma: PrismaClient,
  canonicalOrgId: string,
  canonicalUserId: string,
) {
  const legacyOrg = await prisma.organization.findFirst({
    where: {
      type: "OWNER",
      name: { in: LEGACY_OWNER_ORG_NAMES },
      deletedAt: null,
      id: { not: canonicalOrgId },
    },
    select: { id: true },
  });

  if (!legacyOrg) {
    return { migratedApplications: 0, migratedElevators: 0 };
  }

  const [applications, elevators] = await Promise.all([
    prisma.application.updateMany({
      where: { ownerOrgId: legacyOrg.id, deletedAt: null },
      data: { ownerOrgId: canonicalOrgId, createdById: canonicalUserId },
    }),
    prisma.elevator.updateMany({
      where: { ownerOrgId: legacyOrg.id, deletedAt: null },
      data: { ownerOrgId: canonicalOrgId },
    }),
  ]);

  await prisma.organization.update({
    where: { id: legacyOrg.id },
    data: { deletedAt: new Date() },
  });

  return {
    migratedApplications: applications.count,
    migratedElevators: elevators.count,
  };
}

export async function upsertDemoOwnerProfile(
  prisma: PrismaClient,
  profile: DemoOwnerSeedProfile,
  passwordHash: string,
  municipalityId: string,
  ownerRoleId: string,
) {
  const user = await prisma.authUser.upsert({
    where: { email: profile.email },
    update: {
      passwordHash,
      firstName: profile.firstName,
      lastName: profile.lastName,
      fatherName: profile.fatherName,
      nid: profile.nid,
      phone: profile.phone,
      birthDate: new Date(profile.birthDate),
      isActive: true,
      emailVerified: true,
      deletedAt: null,
    },
    create: {
      email: profile.email,
      passwordHash,
      firstName: profile.firstName,
      lastName: profile.lastName,
      fatherName: profile.fatherName,
      nid: profile.nid,
      phone: profile.phone,
      birthDate: new Date(profile.birthDate),
      isActive: true,
      emailVerified: true,
    },
  });

  let org =
    (await prisma.orgMembership.findFirst({
      where: {
        userId: user.id,
        deactivatedAt: null,
        organization: { type: "OWNER", deletedAt: null },
      },
      select: { organization: true },
    }))?.organization ??
    (profile.nipt
      ? await prisma.organization.findFirst({
          where: { nipt: profile.nipt, deletedAt: null },
        })
      : null) ??
    (await prisma.organization.findFirst({
      where: { type: "OWNER", name: profile.orgName, deletedAt: null },
    }));

  if (org) {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: profile.orgName,
        nipt: profile.nipt,
        ownerBuildingRole: profile.ownerBuildingRole,
        representativeName: profile.representativeName,
        email: profile.email,
        phone: profile.phone,
        municipalityId,
        status: "ACTIVE",
        deletedAt: null,
        ...(profile.ownerBuildingRole === "ADMINISTRATOR" ? { address: null } : {}),
      },
    });
  } else {
    org = await prisma.organization.create({
      data: {
        type: "OWNER",
        name: profile.orgName,
        nipt: profile.nipt,
        ownerBuildingRole: profile.ownerBuildingRole,
        representativeName: profile.representativeName,
        email: profile.email,
        phone: profile.phone,
        municipalityId,
        status: "ACTIVE",
      },
    });
  }

  await prisma.orgMembership.upsert({
    where: {
      userId_organizationId_roleId: {
        userId: user.id,
        organizationId: org.id,
        roleId: ownerRoleId,
      },
    },
    update: { isPrimary: true, deactivatedAt: null },
    create: {
      userId: user.id,
      organizationId: org.id,
      roleId: ownerRoleId,
      isPrimary: true,
    },
  });

  return { user, org };
}

export async function seedDemoOwnerProfiles(
  prisma: PrismaClient,
  passwordHash: string,
  municipalityId: string,
  ownerRoleId: string,
) {
  const results = [];
  for (const profile of DEMO_OWNER_PROFILES) {
    results.push(await upsertDemoOwnerProfile(prisma, profile, passwordHash, municipalityId, ownerRoleId));
  }
  return results;
}

/**
 * Pas seed.ts ose seed të vjetër, NID-i dhe organizata e personit përgjegjës
 * mund të jenë të ndara - aplikimet/njoftimet nuk përputhen me hyrjen me NID.
 */
export async function consolidateDemoOwner(prisma: PrismaClient) {
  await prisma.authUser.updateMany({
    where: { nid: DEMO_OWNER_NID, deletedAt: null },
    data: { email: DEMO_OWNER_EMAIL },
  });

  const legacyEmailOwner = await prisma.authUser.findFirst({
    where: { email: LEGACY_DEMO_OWNER_EMAIL, deletedAt: null },
  });
  if (legacyEmailOwner) {
    await prisma.authUser.update({
      where: { id: legacyEmailOwner.id },
      data: {
        email: DEMO_OWNER_EMAIL,
        nid: legacyEmailOwner.nid ?? DEMO_OWNER_NID,
      },
    });
  }

  await prisma.organization.updateMany({
    where: { type: "OWNER", name: DEMO_OWNER_ORG_NAME, deletedAt: null },
    data: { email: DEMO_OWNER_EMAIL },
  });

  const canonical = await prisma.authUser.findFirst({
    where: { email: DEMO_OWNER_EMAIL, deletedAt: null },
  });
  if (!canonical) return { changed: false as const };

  const ownerRole = await prisma.authRole.findFirst({ where: { code: "OWNER" } });
  const tirana = await prisma.geoMunicipality.findUnique({ where: { code: "TIA" }, select: { id: true } });
  const existingOrg = await prisma.organization.findFirst({
    where: { type: "OWNER", deletedAt: null },
    select: { municipalityId: true },
    orderBy: { createdAt: "asc" },
  });
  const municipalityId = tirana?.id ?? existingOrg?.municipalityId;

  if (ownerRole && municipalityId && canonical.passwordHash) {
    await upsertDemoOwnerProfile(
      prisma,
      DEMO_OWNER_ADMINISTRATOR,
      canonical.passwordHash,
      municipalityId,
      ownerRole.id,
    );
  }

  const refreshed = await prisma.authUser.findFirst({
    where: { email: DEMO_OWNER_EMAIL, deletedAt: null },
  });
  if (!refreshed) return { changed: false as const };

  const canonicalOrgId =
    (
      await prisma.organization.findFirst({
        where: { type: "OWNER", name: DEMO_OWNER_ORG_NAME, deletedAt: null },
        select: { id: true },
      })
    )?.id ??
    (
      await prisma.orgMembership.findFirst({
        where: { userId: refreshed.id, deactivatedAt: null, organization: { type: "OWNER" } },
        select: { organizationId: true },
      })
    )?.organizationId;

  if (!canonicalOrgId) {
    throw new Error(`Organizata demo '${DEMO_OWNER_ORG_NAME}' nuk u gjet.`);
  }

  const legacy = await prisma.authUser.findFirst({
    where: {
      email: LEGACY_OWNER_EMAIL,
      deletedAt: null,
      id: { not: refreshed.id },
    },
  });

  let notificationsMoved = 0;

  if (legacy) {
    const moved = await prisma.notification.updateMany({
      where: { userId: legacy.id },
      data: { userId: refreshed.id },
    });
    notificationsMoved = moved.count;

    await prisma.authUser.update({
      where: { id: legacy.id },
      data: { nid: null, isActive: false, deletedAt: new Date() },
    });
    await prisma.orgMembership.updateMany({
      where: { userId: legacy.id, deactivatedAt: null },
      data: { deactivatedAt: new Date() },
    });
  }

  const nidHolder = await prisma.authUser.findFirst({
    where: {
      nid: DEMO_OWNER_NID,
      deletedAt: null,
      id: { not: refreshed.id },
    },
  });

  if (nidHolder) {
    await prisma.authUser.update({
      where: { id: nidHolder.id },
      data: { nid: null },
    });
  }

  const nidChanged = refreshed.nid !== DEMO_OWNER_NID;
  if (nidChanged) {
    await prisma.authUser.update({
      where: { id: refreshed.id },
      data: { nid: DEMO_OWNER_NID, isActive: true, deletedAt: null },
    });
  }

  const orgMigration = await migrateLegacyOwnerOrg(prisma, canonicalOrgId, refreshed.id);

  return {
    changed: Boolean(
      legacy ||
        nidHolder ||
        nidChanged ||
        orgMigration.migratedApplications > 0 ||
        orgMigration.migratedElevators > 0,
    ),
    canonicalUserId: refreshed.id,
    canonicalOrgId,
    notificationsMoved,
    ...orgMigration,
  };
}
