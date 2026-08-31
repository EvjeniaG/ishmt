import type { PrismaClient } from "@prisma/client";
import {
  DEMO_CERTIFIER_PROFILES,
  DEMO_INSTALLER_PROFILES,
  DEMO_MAINTENANCE_PROFILES,
  DEMO_OWNER_PROFILES,
} from "../../src/lib/demo/demo-seed-profiles";
import { CANONICAL_DEMO_IDENTIFIERS } from "../../src/lib/demo/demo-login-credentials";

const STAFF_EMAILS = [
  "admin@ishmt.gov.al",
  "kryeinspektor@ishmt.gov.al",
  "drejtori@ishmt.gov.al",
  "shef@ishmt.gov.al",
  "terren@ishmt.gov.al",
  "terren2@ishmt.gov.al",
  "drejtoria@ishmt.gov.al",
] as const;

/** Email-et e 17 llogarive demo — burim i vetëm për pastrim. */
export function canonicalDemoUserEmails(): string[] {
  return [
    ...DEMO_OWNER_PROFILES.map((p) => p.email),
    ...DEMO_INSTALLER_PROFILES.map((p) => p.contactEmail),
    ...DEMO_CERTIFIER_PROFILES.map((p) => p.contactEmail),
    ...DEMO_MAINTENANCE_PROFILES.map((p) => p.contactEmail),
    ...STAFF_EMAILS,
  ];
}

export function canonicalDemoIdentifierSet(): Set<string> {
  return new Set(CANONICAL_DEMO_IDENTIFIERS.map((id) => id.toUpperCase()));
}

/** Çaktivizon llogaritë demo jashtë listës së 17 përdoruesve. */
export async function pruneNonCanonicalDemoUsers(prisma: PrismaClient): Promise<number> {
  const keepEmails = new Set(canonicalDemoUserEmails().map((e) => e.toLowerCase()));
  const keepNids = canonicalDemoIdentifierSet();

  const users = await prisma.authUser.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, email: true, nid: true },
  });

  let pruned = 0;
  for (const user of users) {
    if (keepEmails.has(user.email.toLowerCase())) continue;
    if (user.nid && keepNids.has(user.nid.toUpperCase())) continue;

    const orgMembership = await prisma.orgMembership.findFirst({
      where: {
        userId: user.id,
        deactivatedAt: null,
        organization: {
          deletedAt: null,
          nipt: { in: [...keepNids] },
        },
      },
    });
    if (orgMembership) continue;

    await prisma.orgMembership.updateMany({
      where: { userId: user.id, deactivatedAt: null },
      data: { deactivatedAt: new Date() },
    });
    await prisma.authUser.update({
      where: { id: user.id },
      data: { isActive: false, deletedAt: new Date(), nid: null },
    });
    pruned += 1;
  }

  return pruned;
}
