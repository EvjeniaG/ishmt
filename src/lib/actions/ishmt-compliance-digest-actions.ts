"use server";

import { revalidatePath } from "next/cache";
import { ROLE_CODES } from "@/lib/constants/roles";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { IshmtComplianceDigestService } from "@/lib/services/ishmt-compliance-digest-service";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";

export type ComplianceDigestNotifyResult =
  | { success: true; created: number; organizations: number }
  | { success: false; error: string };

const NOTIFY_BATCH_MAX = 1000;
const DIGEST_PATH = "/ishmt/compliance-digest";

const DIGEST_NOTIFY_ROLES = [
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.SECTOR_HEAD,
  ROLE_CODES.ADMIN,
] as const;

function canNotifyComplianceDigest(roleCode: string): boolean {
  return (DIGEST_NOTIFY_ROLES as readonly string[]).includes(roleCode);
}

async function guardDigestNotify(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const ctx = await requireAuthForPage();
  if (!canNotifyComplianceDigest(ctx.roleCode)) {
    return { ok: false, error: "Nuk keni leje për të dërguar njoftime." };
  }
  return { ok: true };
}

export async function notifyExpiredContractsAction(): Promise<ComplianceDigestNotifyResult> {
  try {
    const guard = await guardDigestNotify();
    if (!guard.ok) return { success: false, error: guard.error };

    const rows = await IshmtContractMonitorService.listAllFilteredIssues(
      { issueCategory: "expired" },
      NOTIFY_BATCH_MAX,
    );
    if (rows.length === 0) {
      return { success: false, error: "Nuk ka ashensorë me kontrata të skaduara." };
    }

    const result = await OwnerComplianceNotificationService.notifyStakeholdersForContractIssues(rows);
    revalidatePath(DIGEST_PATH);
    return { success: true, created: result.created, organizations: result.organizations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Njoftimi dështoi.",
    };
  }
}

export async function notifyInspectionExpiring30Action(): Promise<ComplianceDigestNotifyResult> {
  try {
    const guard = await guardDigestNotify();
    if (!guard.ok) return { success: false, error: guard.error };

    const rows = await IshmtContractMonitorService.listAllFilteredIssues(
      {
        issue: "inspection-contract-expiring",
        expiringWithin: 30,
      },
      NOTIFY_BATCH_MAX,
    );
    if (rows.length === 0) {
      return {
        success: false,
        error: "Nuk ka ashensorë me kontrata INP që skadojnë brenda 30 ditëve.",
      };
    }

    const result = await OwnerComplianceNotificationService.notifyStakeholdersForContractIssues(rows);
    revalidatePath(DIGEST_PATH);
    return { success: true, created: result.created, organizations: result.organizations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Njoftimi dështoi.",
    };
  }
}

export async function notifyMissingQrAction(): Promise<ComplianceDigestNotifyResult> {
  try {
    const guard = await guardDigestNotify();
    if (!guard.ok) return { success: false, error: guard.error };

    const rows = await IshmtComplianceDigestService.listMissingQrGaps(NOTIFY_BATCH_MAX);
    if (rows.length === 0) {
      return { success: false, error: "Nuk ka ashensorë pa vendosje QR." };
    }

    const result = await OwnerComplianceNotificationService.notifyStakeholdersForQrGaps(rows);
    revalidatePath(DIGEST_PATH);
    return { success: true, created: result.created, organizations: result.organizations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Njoftimi dështoi.",
    };
  }
}

export async function notifyAllComplianceDigestAction(): Promise<ComplianceDigestNotifyResult> {
  try {
    const guard = await guardDigestNotify();
    if (!guard.ok) return { success: false, error: guard.error };

    const [expiredRows, expiringRows, qrRows] = await Promise.all([
      IshmtContractMonitorService.listAllFilteredIssues(
        { issueCategory: "expired" },
        NOTIFY_BATCH_MAX,
      ),
      IshmtContractMonitorService.listAllFilteredIssues(
        {
          issue: "inspection-contract-expiring",
          expiringWithin: 30,
        },
        NOTIFY_BATCH_MAX,
      ),
      IshmtComplianceDigestService.listMissingQrGaps(NOTIFY_BATCH_MAX),
    ]);

    if (expiredRows.length === 0 && expiringRows.length === 0 && qrRows.length === 0) {
      return { success: false, error: "Nuk ka raste për njoftim." };
    }

    const [expiredResult, expiringResult, qrResult] = await Promise.all([
      expiredRows.length > 0
        ? OwnerComplianceNotificationService.notifyStakeholdersForContractIssues(expiredRows)
        : Promise.resolve({ created: 0, organizations: 0 }),
      expiringRows.length > 0
        ? OwnerComplianceNotificationService.notifyStakeholdersForContractIssues(expiringRows)
        : Promise.resolve({ created: 0, organizations: 0 }),
      qrRows.length > 0
        ? OwnerComplianceNotificationService.notifyStakeholdersForQrGaps(qrRows)
        : Promise.resolve({ created: 0, organizations: 0 }),
    ]);

    revalidatePath(DIGEST_PATH);

    const organizations = new Set<number>();
    organizations.add(expiredResult.organizations);
    organizations.add(expiringResult.organizations);
    organizations.add(qrResult.organizations);

    return {
      success: true,
      created: expiredResult.created + expiringResult.created + qrResult.created,
      organizations:
        expiredResult.organizations + expiringResult.organizations + qrResult.organizations,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Njoftimi dështoi.",
    };
  }
}
