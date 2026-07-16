"use server";

import { revalidatePath } from "next/cache";
import { parseContractIssueFilters } from "@/lib/ishmt/contract-issue-filters";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";

export type ContractNotifyActionResult =
  | { success: true; created: number; organizations: number }
  | { success: false; error: string };

const NOTIFY_BATCH_MAX = 1000;

export async function notifyOwnerForContractIssueAction(input: {
  ownerOrgId: string;
  maintenanceOrgId?: string | null;
  certifierOrgId?: string | null;
  elevatorId: string;
  issueType: string;
  issueLabel: string;
  registryNumber: string;
  dueDate?: string | null;
}): Promise<ContractNotifyActionResult> {
  try {
    const ctx = await requireAuthForPage();
    if (!isIshmtStaffRole(ctx.roleCode)) {
      return { success: false, error: "Nuk keni leje." };
    }

    const result = await OwnerComplianceNotificationService.notifyStakeholdersForContractIssue({
      ownerOrgId: input.ownerOrgId,
      maintenanceOrgId: input.maintenanceOrgId,
      certifierOrgId: input.certifierOrgId,
      elevatorId: input.elevatorId,
      issueType: input.issueType,
      issueLabel: input.issueLabel,
      registryNumber: input.registryNumber,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    });

    revalidatePath("/ishmt/contracts");
    return { success: true, created: result.created, organizations: 1 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Njoftimi dështoi.",
    };
  }
}

export async function notifyFilteredContractOwnersAction(
  rawParams: Record<string, string | undefined>,
): Promise<ContractNotifyActionResult> {
  try {
    const ctx = await requireAuthForPage();
    if (!isIshmtStaffRole(ctx.roleCode)) {
      return { success: false, error: "Nuk keni leje." };
    }

    const filters = parseContractIssueFilters(rawParams);
    const rows = await IshmtContractMonitorService.listAllFilteredIssues(
      filters,
      NOTIFY_BATCH_MAX,
    );

    if (rows.length === 0) {
      return { success: false, error: "Nuk ka raste për njoftim." };
    }

    const result = await OwnerComplianceNotificationService.notifyStakeholdersForContractIssues(rows);
    revalidatePath("/ishmt/contracts");
    return {
      success: true,
      created: result.created,
      organizations: result.organizations,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Njoftimi dështoi.",
    };
  }
}
