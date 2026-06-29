import { MaintenanceContractStatus } from "@prisma/client";
import { db } from "@/lib/db";

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
}
