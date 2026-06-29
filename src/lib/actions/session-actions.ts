"use server";

import { MembershipService } from "@/lib/services/membership-service";
import { requireAuth } from "@/lib/permissions/guards";

export async function switchOrganizationAction(organizationId: string) {
  try {
    const ctx = await requireAuth();
    await MembershipService.switchOrganization(ctx.userId, organizationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gabim i panjohur",
    };
  }
}

export async function getUserMembershipsAction() {
  try {
    const ctx = await requireAuth();
    const memberships = await MembershipService.getUserMemberships(ctx.userId);
    return {
      success: true as const,
      memberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        roleCode: m.role.code,
        isPrimary: m.isPrimary,
      })),
    };
  } catch {
    return { success: false as const, memberships: [] };
  }
}
