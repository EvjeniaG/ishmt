import { MaintenanceContractStatus } from "@prisma/client";
import { db } from "@/lib/db";

/** Certifikuesi/OM menaxhon mirëmbajtjen vetëm kur i është caktuar edhe si kompani mirëmbajtëse. */
export async function certifierOrgHasMaintenanceAssignments(orgId: string): Promise<boolean> {
  const count = await db.maintenanceContract.count({
    where: {
      maintenanceOrgId: orgId,
      serviceType: "MAINTENANCE",
      status: { in: [MaintenanceContractStatus.ACTIVE, MaintenanceContractStatus.PENDING] },
    },
  });
  return count > 0;
}

export function certifierCanManageMaintenanceOnElevator(input: {
  orgId: string | null | undefined;
  maintenanceContracts: Array<{
    serviceType: string;
    isActive: boolean;
    status: string;
    maintenanceOrgId: string;
  }>;
}): boolean {
  if (!input.orgId) return false;
  return input.maintenanceContracts.some(
    (c) =>
      c.serviceType === "MAINTENANCE" &&
      c.maintenanceOrgId === input.orgId &&
      (c.isActive || c.status === MaintenanceContractStatus.PENDING),
  );
}
