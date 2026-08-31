import { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_CODES } from "@/lib/constants/roles";

/** Emri zyrtar i kryeinspektorit në dokumentet e gjeneruara (fallback). */
export const DEFAULT_CHIEF_INSPECTOR_NAME = "Edison Konomi";

/** Emri i kryeinspektorit për nënshkrimet zyrtare - jo i miratuesit (p.sh. drejtori). */
export async function resolveChiefInspectorDisplayName(): Promise<string> {
  const membership = await db.orgMembership.findFirst({
    where: {
      deactivatedAt: null,
      role: { code: ROLE_CODES.CHIEF_INSPECTOR },
      organization: { type: OrgType.ISHMT, deletedAt: null },
      user: { isActive: true, deletedAt: null },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (membership?.user) {
    const name = `${membership.user.firstName} ${membership.user.lastName}`.trim();
    if (name) return name;
  }

  const chiefUser = await db.authUser.findFirst({
    where: { email: "kryeinspektor@ishmt.gov.al", deletedAt: null, isActive: true },
    select: { firstName: true, lastName: true },
  });
  if (chiefUser) {
    const name = `${chiefUser.firstName} ${chiefUser.lastName}`.trim();
    if (name) return name;
  }

  return DEFAULT_CHIEF_INSPECTOR_NAME;
}
