import { AuditAction, MaintenanceContractStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type ContractTerminationMeta = {
  partyLabel: string;
  actorName: string | null;
  terminatedAt: Date;
};

const TERMINATION_ACTION_LABELS: Record<string, string> = {
  CONTRACT_TERMINATED_BY_PROVIDER: "Kompania e mirëmbajtjes",
  INSPECTION_CONTRACT_TERMINATED_BY_PROVIDER: "Organizata OM",
  MAINTENANCE_CONTRACT_TERMINATED_BY_OWNER: "Personi përgjegjës i ashensorit",
  INSPECTION_CONTRACT_TERMINATED_BY_OWNER: "Personi përgjegjës i ashensorit",
  CONTRACT_REJECTED: "Kompania e shërbimit (refuzim)",
};

export const CONTRACT_STATUS_LABELS: Record<MaintenanceContractStatus, string> = {
  PENDING: "Në pritje",
  ACTIVE: "Aktive",
  REJECTED: "E refuzuar",
  EXPIRED: "E skaduar",
  TERMINATED: "E ndërprerë",
};

export type ContractStatusTone = "warning" | "success" | "danger" | "muted";

export const CONTRACT_STATUS_TONE: Record<MaintenanceContractStatus, ContractStatusTone> = {
  PENDING: "warning",
  ACTIVE: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
  TERMINATED: "muted",
};

export const CONTRACT_SERVICE_TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: "Mirëmbajtje",
  PERIODIC_INSPECTION: "Inspektim periodik",
};

export class MaintenanceContractService {
  /**
   * Display status that accounts for expiry without requiring a DB write:
   * an ACTIVE contract past its endDate is shown as EXPIRED.
   */
  static effectiveStatus(contract: {
    status: MaintenanceContractStatus;
    endDate: Date | null;
  }): MaintenanceContractStatus {
    if (
      contract.status === MaintenanceContractStatus.ACTIVE &&
      contract.endDate &&
      contract.endDate.getTime() < Date.now()
    ) {
      return MaintenanceContractStatus.EXPIRED;
    }
    return contract.status;
  }

  /**
   * Persist expiry for ACTIVE contracts whose endDate has passed.
   * Keeps `isActive` in sync (false) so dependent queries stop counting them.
   * Returns the number of contracts expired.
   */
  static async expireOverdue(): Promise<number> {
    const result = await db.maintenanceContract.updateMany({
      where: {
        status: MaintenanceContractStatus.ACTIVE,
        isActive: true,
        endDate: { lt: new Date() },
      },
      data: { status: MaintenanceContractStatus.EXPIRED, isActive: false },
    });
    return result.count;
  }

  /** Kush e ndërpreu/refuzoi kontratën - lexohet nga audit log. */
  static async loadTerminationMeta(
    contractIds: string[],
  ): Promise<Map<string, ContractTerminationMeta>> {
    const map = new Map<string, ContractTerminationMeta>();
    if (contractIds.length === 0) return map;

    const logs = await db.auditLog.findMany({
      where: {
        entityType: "maintenance_contract",
        entityId: { in: contractIds },
        action: AuditAction.UPDATE,
      },
      include: {
        actor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const log of logs) {
      if (map.has(log.entityId)) continue;

      const afterState = log.afterState as { action?: string } | null;
      const actionKey = afterState?.action;
      if (!actionKey || !(actionKey in TERMINATION_ACTION_LABELS)) continue;

      const actorName = log.actor
        ? `${log.actor.firstName} ${log.actor.lastName}`.trim()
        : null;

      map.set(log.entityId, {
        partyLabel: TERMINATION_ACTION_LABELS[actionKey],
        actorName,
        terminatedAt: log.createdAt,
      });
    }

    return map;
  }
}
