import { OrgStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEMO_CERTIFIER_PROFILES,
  DEMO_INSTALLER_PROFILES,
  DEMO_MAINTENANCE_PROFILES,
  type DemoCompanySeedProfile,
} from "@/lib/demo/demo-seed-profiles";

type DemoOrgRecord = {
  id: string;
  name: string;
  nipt: string | null;
};

async function resolveDemoCompanyFromProfiles(
  type: typeof OrgType.INSTALLER | typeof OrgType.CERTIFIER,
  profiles: DemoCompanySeedProfile[],
): Promise<DemoOrgRecord | null> {
  const now = new Date();
  const nipts = profiles.map((profile) => profile.nipt);

  const orgs = await db.organization.findMany({
    where: {
      type,
      nipt: { in: nipts },
      status: { in: [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED] },
      deletedAt: null,
      licenses: { some: { status: OrgStatus.ACTIVE, expiryDate: { gte: now } } },
    },
    select: { id: true, name: true, nipt: true },
  });

  for (const profile of profiles) {
    const org = orgs.find((candidate) => candidate.nipt === profile.nipt);
    if (org) return org;
  }

  return null;
}

/** Kompani instaluese nga seed-i demo (p.sh. installer@ashensorepro.al). */
export async function resolveDemoInstallerOrganization() {
  return resolveDemoCompanyFromProfiles(OrgType.INSTALLER, DEMO_INSTALLER_PROFILES);
}

/** Kompani certifikuese nga seed-i demo (p.sh. cert@omicert.al). */
export async function resolveDemoCertifierOrganization() {
  return resolveDemoCompanyFromProfiles(OrgType.CERTIFIER, DEMO_CERTIFIER_PROFILES);
}

/** Kompani mirëmbajtjeje nga seed-i demo (p.sh. mirembajtje@servisashensore.al). */
export async function resolveDemoMaintenanceOrganization() {
  const nipts = DEMO_MAINTENANCE_PROFILES.map((profile) => profile.nipt);

  const orgs = await db.organization.findMany({
    where: {
      type: OrgType.MAINTENANCE,
      nipt: { in: nipts },
      status: { in: [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED] },
      qkbValidated: true,
      deletedAt: null,
    },
    select: { id: true, name: true, nipt: true },
  });

  for (const profile of DEMO_MAINTENANCE_PROFILES) {
    const org = orgs.find((candidate) => candidate.nipt === profile.nipt);
    if (org) return org;
  }

  return null;
}
