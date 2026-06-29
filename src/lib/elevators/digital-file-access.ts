import { MaintenanceContractStatus } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { ElevatorService } from "@/lib/services/elevator-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export async function orgCanAccessDigitalFile(orgId: string, elevatorId: string): Promise<boolean> {
  const elevator = await db.elevator.findFirst({
    where: { id: elevatorId, deletedAt: null },
    select: {
      ownerOrgId: true,
      maintenanceOrgId: true,
      certifierOrgId: true,
    },
  });
  if (!elevator) return false;

  if (
    elevator.ownerOrgId === orgId ||
    elevator.maintenanceOrgId === orgId ||
    elevator.certifierOrgId === orgId
  ) {
    return true;
  }

  const contract = await db.maintenanceContract.findFirst({
    where: {
      elevatorId,
      maintenanceOrgId: orgId,
      status: { in: [MaintenanceContractStatus.PENDING, MaintenanceContractStatus.ACTIVE] },
    },
  });
  return Boolean(contract);
}

type DigitalFileLoadResult =
  | { status: "unauthorized" }
  | { status: "not_found" }
  | { status: "ok"; elevator: NonNullable<Awaited<ReturnType<typeof ElevatorService.ensureDigitalFileAssets>>> };

export async function loadDigitalFileForViewer(
  elevatorId: string,
  viewer: { roleCode: RoleCode; activeOrgId: string | null; userId: string },
): Promise<DigitalFileLoadResult> {
  if (!roleHasPermission(viewer.roleCode, PERMISSIONS.ELEVATORS_VIEW_DIGITAL_FILE)) {
    return { status: "unauthorized" };
  }

  let ownerScopeOrgId: string | null = null;

  if (isIshmtStaffRole(viewer.roleCode)) {
    ownerScopeOrgId = null;
  } else if (viewer.roleCode === ROLE_CODES.OWNER) {
    if (!viewer.activeOrgId) return { status: "unauthorized" };
    ownerScopeOrgId = viewer.activeOrgId;
  } else if (
    viewer.roleCode === ROLE_CODES.CERTIFIER ||
    viewer.roleCode === ROLE_CODES.MAINTENANCE
  ) {
    if (!viewer.activeOrgId) return { status: "unauthorized" };
    const allowed = await orgCanAccessDigitalFile(viewer.activeOrgId, elevatorId);
    if (!allowed) return { status: "not_found" };
    ownerScopeOrgId = null;
  } else {
    return { status: "unauthorized" };
  }

  const elevator = await ElevatorService.ensureDigitalFileAssets(
    elevatorId,
    ownerScopeOrgId,
    viewer.userId,
  );
  if (!elevator) return { status: "not_found" };
  return { status: "ok", elevator };
}
