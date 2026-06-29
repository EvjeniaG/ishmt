import { db } from "@/lib/db";
import { buildSessionContextForOrg } from "@/lib/auth/session-context";

/**
 * Validates that activeOrgId belongs to the authenticated user.
 * Returns refreshed session context or null if invalid.
 */
export async function validateUserOrgMembership(userId: string, activeOrgId: string) {
  const membership = await db.orgMembership.findFirst({
    where: {
      userId,
      organizationId: activeOrgId,
      deactivatedAt: null,
    },
  });

  if (!membership) {
    return null;
  }

  return buildSessionContextForOrg(userId, activeOrgId);
}
