import { OrgStatus, OrgType, type PrismaClient } from "@prisma/client";
import { DEMO_INSTALL_CLAIM_POOL } from "../../src/lib/demo/demo-install-claim-pool";
import { DEMO_OM_CLAIM_POOL } from "../../src/lib/demo/demo-om-claim-pool";
import { DEMO_DUAL_LICENSE_CLAIM_POOL } from "../../src/lib/demo/demo-dual-license-claim-pool";

type ClaimProfile = {
  orgName: string;
  nipt: string;
  licenseNumber: string;
  email: string;
};

async function seedClaimPool(
  prisma: PrismaClient,
  municipalityId: string,
  licenseExpiry: Date,
  profiles: ClaimProfile[],
  config: {
    orgType: typeof OrgType.INSTALLER | typeof OrgType.CERTIFIER;
    capField: "capInstall" | "capOm";
    licenseType: "INSTALLATION" | "CERTIFICATION";
    label: string;
  },
) {
  for (const profile of profiles) {
    const org = await prisma.organization.upsert({
      where: { nipt: profile.nipt },
      update: {
        [config.capField]: true,
        name: profile.orgName,
        status: OrgStatus.ACTIVE_AUTHORIZED,
        email: profile.email,
        deletedAt: null,
      },
      create: {
        type: config.orgType,
        [config.capField]: true,
        name: profile.orgName,
        nipt: profile.nipt,
        status: OrgStatus.ACTIVE_AUTHORIZED,
        municipalityId,
        email: profile.email,
      },
    });

    const existing = await prisma.organizationLicense.findFirst({
      where: { organizationId: org.id, licenseNumber: profile.licenseNumber },
    });

    if (!existing) {
      await prisma.organizationLicense.create({
        data: {
          organizationId: org.id,
          licenseNumber: profile.licenseNumber,
          licenseType: config.licenseType,
          issuedDate: new Date("2026-01-01"),
          expiryDate: licenseExpiry,
          status: OrgStatus.ACTIVE,
          issuedBy: "Drejtoria e Politikave të Tregut të Brendshëm",
        },
      });
    }
  }

  console.log(`✓ ${profiles.length} kompani ${config.label} demo (pa llogari) me numra licence`);
}

export async function seedDemoOmClaimPool(
  prisma: PrismaClient,
  municipalityId: string,
  licenseExpiry: Date,
) {
  await seedClaimPool(prisma, municipalityId, licenseExpiry, DEMO_OM_CLAIM_POOL, {
    orgType: OrgType.CERTIFIER,
    capField: "capOm",
    licenseType: "CERTIFICATION",
    label: "OM",
  });
}

export async function seedDemoInstallClaimPool(
  prisma: PrismaClient,
  municipalityId: string,
  licenseExpiry: Date,
) {
  await seedClaimPool(prisma, municipalityId, licenseExpiry, DEMO_INSTALL_CLAIM_POOL, {
    orgType: OrgType.INSTALLER,
    capField: "capInstall",
    licenseType: "INSTALLATION",
    label: "instalimi",
  });
}

export async function seedDemoDualLicenseClaimPool(
  prisma: PrismaClient,
  municipalityId: string,
  licenseExpiry: Date,
) {
  for (const profile of DEMO_DUAL_LICENSE_CLAIM_POOL) {
    const org = await prisma.organization.upsert({
      where: { nipt: profile.nipt },
      update: {
        capInstall: true,
        capOm: true,
        name: profile.orgName,
        status: OrgStatus.ACTIVE_AUTHORIZED,
        email: profile.email,
        deletedAt: null,
      },
      create: {
        type: OrgType.INSTALLER,
        capInstall: true,
        capOm: true,
        name: profile.orgName,
        nipt: profile.nipt,
        status: OrgStatus.ACTIVE_AUTHORIZED,
        municipalityId,
        email: profile.email,
      },
    });

    for (const license of [
      { licenseNumber: profile.installLicenseNumber, licenseType: "INSTALLATION" as const },
      { licenseNumber: profile.omLicenseNumber, licenseType: "CERTIFICATION" as const },
    ]) {
      const existing = await prisma.organizationLicense.findFirst({
        where: { organizationId: org.id, licenseNumber: license.licenseNumber },
      });

      if (!existing) {
        await prisma.organizationLicense.create({
          data: {
            organizationId: org.id,
            licenseNumber: license.licenseNumber,
            licenseType: license.licenseType,
            issuedDate: new Date("2026-01-01"),
            expiryDate: licenseExpiry,
            status: OrgStatus.ACTIVE,
            issuedBy: "Drejtoria e Politikave të Tregut të Brendshëm",
          },
        });
      }
    }
  }

  console.log(
    `✓ ${DEMO_DUAL_LICENSE_CLAIM_POOL.length} kompani demo me licencë instalimi + OM (pa llogari)`,
  );
}

export async function seedDemoLicensedClaimPools(
  prisma: PrismaClient,
  municipalityId: string,
  licenseExpiry: Date,
) {
  await seedDemoDualLicenseClaimPool(prisma, municipalityId, licenseExpiry);
  await seedDemoInstallClaimPool(prisma, municipalityId, licenseExpiry);
  await seedDemoOmClaimPool(prisma, municipalityId, licenseExpiry);
}
