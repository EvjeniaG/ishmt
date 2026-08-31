import { MaintenanceContractStatus } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { ElevatorService } from "@/lib/services/elevator-service";
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/codes";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";
import { resolveDossierViewerKind, type DossierViewerKind } from "@/lib/elevators/dossier-viewer";

const CONTRACT_ACCESS_STATUSES: MaintenanceContractStatus[] = [
  MaintenanceContractStatus.PENDING,
  MaintenanceContractStatus.ACTIVE,
  MaintenanceContractStatus.EXPIRED,
];

export type ElevatorDigitalFileAccess =
  | { kind: "owner" }
  | { kind: "installer" }
  | { kind: "certifier" }
  | { kind: "maintenance" }
  | { kind: "ishmt" }
  | { kind: "none" };

export function dossierViewerKindFromAccess(
  access: ElevatorDigitalFileAccess,
  roleCode: RoleCode,
): DossierViewerKind {
  if (access.kind === "owner") return "owner";
  if (access.kind === "installer") return "installer";
  if (access.kind === "certifier") return "certifier";
  if (access.kind === "maintenance") return "maintenance";
  if (access.kind === "ishmt") return "ishmt_staff";
  if (isIshmtStaffRole(roleCode)) return "ishmt_staff";
  return resolveDossierViewerKind(roleCode);
}

export type DigitalFileViewer = {
  roleCode: RoleCode;
  activeOrgId: string | null;
  userId: string;
  permissions: readonly PermissionCode[];
  orgCapabilities?: OrgCapabilities | null;
};

type DigitalFileLoadResult =
  | { status: "unauthorized" }
  | { status: "not_found" }
  | {
      status: "ok";
      elevator: NonNullable<Awaited<ReturnType<typeof ElevatorService.ensureDigitalFileAssets>>>;
      viewerKind: DossierViewerKind;
      access: ElevatorDigitalFileAccess;
    };

function viewerCanOpenDigitalFile(viewer: DigitalFileViewer): boolean {
  return viewer.permissions.includes(PERMISSIONS.ELEVATORS_VIEW_DIGITAL_FILE);
}

/** Palë me kontratë shërbimi, caktim direkt në ashensor, ose pronari. */
export async function resolveElevatorDigitalFileAccess(
  orgId: string,
  elevatorId: string,
): Promise<Exclude<ElevatorDigitalFileAccess, { kind: "ishmt" }>> {
  const elevator = await db.elevator.findFirst({
    where: { id: elevatorId, deletedAt: null },
    select: {
      ownerOrgId: true,
      installerOrgId: true,
      maintenanceOrgId: true,
      certifierOrgId: true,
    },
  });
  if (!elevator) return { kind: "none" };

  if (elevator.ownerOrgId === orgId) return { kind: "owner" };
  if (elevator.installerOrgId === orgId) return { kind: "installer" };

  const contracts = await db.maintenanceContract.findMany({
    where: {
      elevatorId,
      maintenanceOrgId: orgId,
      status: { in: CONTRACT_ACCESS_STATUSES },
    },
    select: { serviceType: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const openContract = contracts.find(
    (row) =>
      row.status === MaintenanceContractStatus.PENDING ||
      row.status === MaintenanceContractStatus.ACTIVE,
  );

  if (openContract?.serviceType === "PERIODIC_INSPECTION") {
    return { kind: "certifier" };
  }
  if (openContract?.serviceType === "MAINTENANCE") {
    return { kind: "maintenance" };
  }

  if (elevator.certifierOrgId === orgId) return { kind: "certifier" };
  if (elevator.maintenanceOrgId === orgId) return { kind: "maintenance" };

  const latestContract = contracts[0];
  if (latestContract?.serviceType === "PERIODIC_INSPECTION") {
    return { kind: "certifier" };
  }
  if (latestContract?.serviceType === "MAINTENANCE") {
    return { kind: "maintenance" };
  }

  return { kind: "none" };
}

export async function orgCanAccessDigitalFile(orgId: string, elevatorId: string): Promise<boolean> {
  const access = await resolveElevatorDigitalFileAccess(orgId, elevatorId);
  return access.kind !== "none";
}

export async function loadDigitalFileForViewer(
  elevatorId: string,
  viewer: DigitalFileViewer,
): Promise<DigitalFileLoadResult> {
  if (!viewerCanOpenDigitalFile(viewer)) {
    return { status: "unauthorized" };
  }

  if (viewer.roleCode === ROLE_CODES.DIRECTORATE || isIshmtStaffRole(viewer.roleCode)) {
    const elevator = await ElevatorService.ensureDigitalFileAssets(
      elevatorId,
      null,
      viewer.userId,
    );
    if (!elevator) return { status: "not_found" };
    return {
      status: "ok",
      elevator,
      viewerKind: "ishmt_staff",
      access: { kind: "ishmt" },
    };
  }

  if (!viewer.activeOrgId) return { status: "unauthorized" };

  const access = await resolveElevatorDigitalFileAccess(viewer.activeOrgId, elevatorId);
  if (access.kind === "none") {
    return { status: "not_found" };
  }

  const ownerScopeOrgId = access.kind === "owner" ? viewer.activeOrgId : null;
  const elevator = await ElevatorService.ensureDigitalFileAssets(
    elevatorId,
    ownerScopeOrgId,
    viewer.userId,
  );
  if (!elevator) return { status: "not_found" };

  return {
    status: "ok",
    elevator,
    viewerKind: dossierViewerKindFromAccess(access, viewer.roleCode),
    access,
  };
}
