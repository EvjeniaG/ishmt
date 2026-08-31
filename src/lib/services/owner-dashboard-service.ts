import {
  ApplicationStatus,
  ComplianceIndicator,
  DelegationStatus,
  DelegationType,
  ElevatorStatus,
  ReturnTargetRole,
} from "@prisma/client";
import { db } from "@/lib/db";
import { computeElevatorComplianceIndicator } from "@/lib/elevators/elevator-compliance-stats";
import { NotificationService } from "@/lib/services/notification-service";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";
import { ApplicationService } from "@/lib/services/application-service";
import { DeadlineService, ISHMT_PROCEDURE_REVIEW_STATUSES } from "@/lib/deadlines/deadline-service";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import type { RequiredActionItem } from "@/lib/dashboard/required-actions";
import { OWNER_TERM } from "@/lib/constants/owner-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { registrationPhasePath, resolveRegistrationPhase, buildRegistrationPhaseInput } from "@/lib/registration/phase-router";
import { isReturnedToRole } from "@/lib/workflows/return-targets";

const EXPIRY_WINDOW_DAYS = 30;

const OWNER_SIDE_IN_PROGRESS_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.BASIC_DATA_COMPLETED,
  ApplicationStatus.PENDING_INSTALLER,
  ApplicationStatus.INSTALLER_INVITED,
  ApplicationStatus.INSTALLER_ACCEPTED,
  ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
  ApplicationStatus.TECHNICAL_DATA_COMPLETED,
  ApplicationStatus.INSTALLER_COMPLETED,
  ApplicationStatus.PENDING_CERTIFIER,
  ApplicationStatus.CERTIFIER_INVITED,
  ApplicationStatus.CERTIFIER_ACCEPTED,
  ApplicationStatus.CERTIFICATION_IN_PROGRESS,
  ApplicationStatus.CERTIFICATION_COMPLETED,
  ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES,
  ApplicationStatus.PENDING_OWNER_SUBMISSION,
];


export type { RequiredActionItem } from "@/lib/dashboard/required-actions";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function applicationHref(app: {
  id: string;
  type: import("@prisma/client").ApplicationType;
  status: ApplicationStatus;
  returnToRole?: ReturnTargetRole | null;
  installerOrgId?: string | null;
  certifierOrgId?: string | null;
  delegations?: {
    accessType: import("@prisma/client").DelegationType;
    organizationId: string;
    status: import("@prisma/client").DelegationStatus;
    expiresAt?: Date | null;
  }[];
  data?: { registrationExtendedData?: unknown } | null;
}) {
  if (app.type === "NEW_REGISTRATION") {
    const phase = resolveRegistrationPhase(buildRegistrationPhaseInput(app), ROLE_CODES.OWNER);
    return registrationPhasePath(app.id, phase);
  }
  return `/portal/applications/${app.id}`;
}

export class OwnerDashboardService {
  static async getDashboard(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personat përgjegjës të ashensorit mund të shohin panelin e personit përgjegjës të ashensorit.");
    }

    const orgId = ctx.activeOrgId;
    const now = new Date();
    const expiryThreshold = addDays(now, EXPIRY_WINDOW_DAYS);

    const [
      user,
      org,
      activeElevators,
      inProgressApplications,
      returnedApplications,
      certExpiring,
      inspectionDue,
      noMaintenanceElevators,
      noInspectionElevators,
      noMaintenanceRecords,
      qrUnconfirmed,
      activeElevatorsForCompliance,
      recentApplications,
      recentElevators,
      deadlineItems,
      submittedProcedureApps,
      returnedAppsList,
      pendingOwnerApps,
      draftApps,
      unreadNotifications,
      incomingOwnershipTransfers,
    ] = await Promise.all([
      db.authUser.findUnique({
        where: { id: ctx.userId },
        select: { firstName: true, lastName: true, lastLoginAt: true },
      }),
      db.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        include: { municipality: true },
      }),
      db.elevator.count({
        where: { ownerOrgId: orgId, status: ElevatorStatus.ACTIVE, deletedAt: null },
      }),
      db.application.count({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: { in: OWNER_SIDE_IN_PROGRESS_STATUSES },
        },
      }),
      db.application.count({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          OR: [
            { status: ApplicationStatus.RETURNED },
            { returnToRole: ReturnTargetRole.OWNER },
          ],
        },
      }),
      db.certificate.count({
        where: {
          status: "ACTIVE",
          expiryDate: { lte: expiryThreshold, gte: now },
          elevator: { ownerOrgId: orgId, deletedAt: null, status: ElevatorStatus.ACTIVE },
        },
      }),
      db.inspection.count({
        where: {
          nextInspectionDate: { lte: expiryThreshold, gte: now },
          elevator: { ownerOrgId: orgId, deletedAt: null, status: ElevatorStatus.ACTIVE },
        },
      }),
      db.elevator.count({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: ElevatorStatus.ACTIVE,
          maintenanceOrgId: null,
        },
      }),
      db.elevator.count({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: ElevatorStatus.ACTIVE,
          inspections: { none: { conductedDate: { not: null } } },
        },
      }),
      db.elevator.count({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: ElevatorStatus.ACTIVE,
          maintenanceOrgId: { not: null },
          maintenanceRecords: { none: {} },
        },
      }),
      db.elevator.count({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: ElevatorStatus.ACTIVE,
          qrCodes: {
            some: {
              isActive: true,
              placementPhotoDocumentId: null,
            },
          },
        },
      }),
      db.elevator.findMany({
        where: { ownerOrgId: orgId, deletedAt: null, status: ElevatorStatus.ACTIVE },
        include: {
          inspections: { where: { conductedDate: { not: null } }, orderBy: { conductedDate: "desc" }, take: 1 },
          maintenanceRecords: { orderBy: { performedDate: "desc" }, take: 1 },
          maintenanceCompliance: true,
          complianceIndicator: true,
          certificates: { where: { type: "REGISTRATION", status: "ACTIVE" }, take: 1 },
        },
      }),
      db.application.findMany({
        where: { ownerOrgId: orgId, deletedAt: null },
        include: { data: { include: { municipality: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.elevator.findMany({
        where: { ownerOrgId: orgId, deletedAt: null },
        include: {
          municipality: true,
          technicalData: true,
          complianceIndicator: true,
          maintenanceOrg: true,
          qrCodes: { where: { isActive: true }, take: 1 },
          certificates: { where: { status: "ACTIVE", type: "REGISTRATION" }, take: 1 },
          inspections: { orderBy: { conductedDate: "desc" }, take: 1 },
          maintenanceRecords: { orderBy: { performedDate: "desc" }, take: 1 },
          maintenanceCompliance: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.getDeadlineItems(orgId, expiryThreshold, now),
      db.application.findMany({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: { in: ISHMT_PROCEDURE_REVIEW_STATUSES },
          submittedAt: { not: null },
        },
        select: { id: true, applicationNumber: true, submittedAt: true, status: true, type: true },
        orderBy: { submittedAt: "asc" },
      }),
      db.application.findMany({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          OR: [
            { status: ApplicationStatus.RETURNED },
            { returnToRole: ReturnTargetRole.OWNER },
          ],
        },
        include: { data: { include: { municipality: true } } },
        orderBy: { returnedAt: "desc" },
        take: 5,
      }),
      db.application.findMany({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: ApplicationStatus.PENDING_OWNER_SUBMISSION,
        },
        include: { data: true },
        take: 5,
      }),
      db.application.findMany({
        where: {
          ownerOrgId: orgId,
          deletedAt: null,
          status: { in: [ApplicationStatus.DRAFT, ApplicationStatus.BASIC_DATA_COMPLETED] },
        },
        include: { data: true },
        take: 5,
      }),
      NotificationService.unreadCount(ctx.userId),
      db.application.findMany({
        where: {
          deletedAt: null,
          delegations: {
            some: {
              organizationId: orgId,
              accessType: DelegationType.OWNERSHIP_RECIPIENT,
              status: { in: [DelegationStatus.INVITED, DelegationStatus.PENDING] },
            },
          },
        },
        include: {
          ownerOrg: true,
          targetElevator: true,
          delegations: true,
        },
        take: 5,
      }),
    ]);

    const redCompliance = activeElevatorsForCompliance.filter(
      (elv) => computeElevatorComplianceIndicator(elv) === ComplianceIndicator.RED,
    ).length;

    const requiredActions = this.buildRequiredActions({
      draftApps,
      returnedAppsList,
      pendingOwnerApps,
      deadlineItems,
      submittedProcedureApps,
      incomingOwnershipTransfers,
    });

    void OwnerComplianceNotificationService.syncForOrganization(
      orgId,
      OwnerComplianceNotificationService.alertsFromDeadlineItems(deadlineItems),
    );

    const procedureSummary = DeadlineService.summarizeProcedureQueue(
      submittedProcedureApps.map((a) => ({
        id: a.id,
        applicationNumber: a.applicationNumber,
        submittedAt: a.submittedAt,
      })),
    );

    const elevatorRows = recentElevators.map((elv) => {
      const complianceView = resolveElevatorComplianceView({
        status: elv.status,
        maintenanceOrgId: elv.maintenanceOrgId,
        inspections: elv.inspections,
        maintenanceRecords: elv.maintenanceRecords,
        maintenanceCompliance: elv.maintenanceCompliance,
        complianceIndicator: elv.complianceIndicator,
        certificates: elv.certificates,
      });
      const regCert = elv.certificates[0];
      return {
        id: elv.id,
        registryNumber: elv.registryNumber,
        certificateNumber: regCert?.certificateNumber ?? "-",
        brand: elv.technicalData?.manufacturer ?? "-",
        serialNumber: elv.technicalData?.serialNumber ?? "-",
        address: elv.buildingAddress,
        status: elv.status,
        statusLabel: labelElevatorStatus(elv.status),
        compliance: complianceView.display,
        complianceGaps: complianceView.gaps.filter((g) => g.level !== "info"),
        nextInspectionDate: elv.inspections[0]?.nextInspectionDate ?? null,
        hasQrPlacement: Boolean(elv.qrCodes[0]?.placementPhotoDocumentId),
      };
    });

    const applicationRows = recentApplications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      type: app.type,
      status: app.status,
      statusLabel: APPLICATION_STATUS_LABELS[app.status],
      address: app.data?.buildingAddress ?? "-",
      createdAt: app.createdAt,
      nextAction: ApplicationService.getNextRequiredAction(app, ROLE_CODES.OWNER, orgId),
      href: applicationHref(app),
    }));

    return {
      identity: {
        userName: user ? `${user.firstName} ${user.lastName}` : ctx.firstName,
        organizationName: org?.name ?? ctx.activeOrgName,
        roleLabel: OWNER_TERM,
        municipality: org?.municipality?.nameSq ?? "-",
        lastLoginAt: user?.lastLoginAt ?? null,
      },
      cards: {
        activeElevators,
        inProgressApplications,
        returnedApplications,
        certExpiring,
        inspectionDue,
        noMaintenanceElevators,
        noInspectionElevators,
        noMaintenanceRecords,
        qrUnconfirmed,
        redCompliance,
      },
      alarmSummary: {
        noMaintenanceContract: deadlineItems.filter((i) => i.type === "missing-maintenance-contract").length,
        noInspectionContract: deadlineItems.filter((i) => i.type === "missing-inspection-contract").length,
        contractExpiring: deadlineItems.filter((i) => i.type.includes("contract-expiring")).length,
        contractExpired: deadlineItems.filter((i) => i.type.includes("contract-expired")).length,
        pendingContracts: deadlineItems.filter((i) => i.type.includes("pending-")).length,
        complianceGaps: deadlineItems.filter((i) => !i.type.includes("contract") && i.type !== "qr_placement").length,
      },
      requiredActions,
      procedureSummary,
      recentApplications: applicationRows,
      recentElevators: elevatorRows,
      unreadNotifications,
    };
  }

  private static buildRequiredActions(input: {
    draftApps: { id: string; applicationNumber: string; type: import("@prisma/client").ApplicationType; status: ApplicationStatus; data: { buildingAddress: string | null } | null }[];
    returnedAppsList: { id: string; applicationNumber: string; type: import("@prisma/client").ApplicationType; status: ApplicationStatus; data: { buildingAddress: string | null } | null; returnReason: string | null }[];
    pendingOwnerApps: { id: string; applicationNumber: string; type: import("@prisma/client").ApplicationType; status: ApplicationStatus; data: { buildingAddress: string | null } | null }[];
    deadlineItems: { type: string; label: string; elevatorId: string; registryNumber: string; date?: Date }[];
    submittedProcedureApps: {
      id: string;
      applicationNumber: string;
      submittedAt: Date | null;
      status: ApplicationStatus;
      type: import("@prisma/client").ApplicationType;
    }[];
    incomingOwnershipTransfers: {
      id: string;
      applicationNumber: string;
      ownerOrg: { name: string };
      targetElevator: { registryNumber: string } | null;
    }[];
  }): RequiredActionItem[] {
    const actions: RequiredActionItem[] = [];

    for (const app of input.submittedProcedureApps) {
      if (!app.submittedAt) continue;
      const item = DeadlineService.buildProcedureDeadlineItem({
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        protocolAt: app.submittedAt,
      });
      actions.push({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        severity: item.isOverdue ? "danger" : item.severity === "orange" ? "warning" : "info",
        href: item.href ?? applicationHref(app),
        actionLabel: "Ndiq statusin",
        dueDate: item.dueDate,
      });
    }

    for (const app of input.incomingOwnershipTransfers) {
      actions.push({
        id: `ownership-in-${app.id}`,
        title: "Ftesë transferimi pronësie",
        subtitle: `${app.ownerOrg.name} · ${app.targetElevator?.registryNumber ?? app.applicationNumber}`,
        severity: "warning",
        href: `/portal/applications/${app.id}`,
        actionLabel: "Prano ose refuzo",
      });
    }

    for (const app of input.draftApps) {
      actions.push({
        id: `draft-${app.id}`,
        title: "Aplikim draft i papërfunduar",
        subtitle: `${app.applicationNumber} · ${app.data?.buildingAddress ?? "-"}`,
        severity: "info",
        href: `/portal/applications/${app.id}`,
        actionLabel: "Vazhdo draftin",
      });
    }

    for (const app of input.returnedAppsList) {
      if (!isReturnedToRole(app as Parameters<typeof isReturnedToRole>[0], ReturnTargetRole.OWNER)) {
        continue;
      }
      actions.push({
        id: `returned-${app.id}`,
        title: "Aplikim i kthyer për korrigjim",
        subtitle: `${app.applicationNumber} · ${app.returnReason ?? "Pa arsye"}`,
        severity: "danger",
        href: `/portal/applications/${app.id}`,
        actionLabel: "Plotëso korrigjimin",
      });
    }

    for (const app of input.pendingOwnerApps) {
      actions.push({
        id: `submit-${app.id}`,
        title: "Gati për parashtrim te IQMT",
        subtitle: `${app.applicationNumber} · ${app.data?.buildingAddress ?? "-"}`,
        severity: "warning",
        href: `/portal/applications/${app.id}`,
        actionLabel: "Rishiko final",
      });
    }

    for (const item of input.deadlineItems) {
      const severity =
        item.type.includes("missing") ||
        item.type.includes("invalid") ||
        item.type === "certificate" ||
        item.type === "maintenance" ||
        item.type === "inspection_overdue" ||
        item.type === "suspended" ||
        item.type === "deregistered"
          ? "danger"
          : item.type === "qr_placement" || item.type.includes("expiring")
            ? "warning"
            : "warning";

      const href =
        item.type === "qr_placement"
          ? `/portal/elevators/${item.elevatorId}?tab=qr`
          : item.type === "missing-maintenance-company" ||
              item.type === "missing-maintenance-contract" ||
              item.type === "pending-maintenance-contract" ||
              item.type === "maintenance-contract-expiring" ||
              item.type === "maintenance-contract-expired"
            ? `/portal/maintenance`
            : item.type === "missing-inspection-contract" ||
                item.type === "pending-inspection-contract" ||
                item.type === "inspection-contract-expiring" ||
                item.type === "inspection-contract-expired"
              ? `/portal/kontroll-periodik`
              : item.type.includes("maintenance")
                ? `/portal/elevators/${item.elevatorId}?tab=maintenance`
                : item.type.includes("inspection") || item.type === "missing-inspection"
                  ? `/portal/elevators/${item.elevatorId}?tab=inspections`
                  : `/portal/elevators/${item.elevatorId}`;

      const actionLabel =
        item.type === "qr_placement"
          ? "Ngarko foton QR"
          : item.type === "missing-maintenance-company" || item.type === "missing-maintenance-contract"
            ? "Cakto mirëmbajtës"
            : item.type === "missing-inspection-contract"
              ? "Cakto OM"
              : item.type === "pending-maintenance-contract" || item.type === "pending-inspection-contract"
                ? "Shiko kontratën"
                : item.type.includes("contract-expiring") || item.type.includes("contract-expired")
                  ? "Rinovo kontratën"
                  : item.type === "missing-inspection"
                    ? "Shiko inspektimet"
                    : item.type.includes("maintenance")
                      ? "Menaxho mirëmbajtjen"
                      : "Shiko ashensorin";

      actions.push({
        id: `deadline-${item.elevatorId}-${item.type}`,
        title: item.label,
        subtitle: item.registryNumber,
        severity,
        href,
        actionLabel,
        dueDate: item.date,
      });
    }

    return actions.slice(0, 20);
  }

  private static async getDeadlineItems(orgId: string, expiryThreshold: Date, now: Date) {
    const elevators = await db.elevator.findMany({
      where: { ownerOrgId: orgId, deletedAt: null, status: ElevatorStatus.ACTIVE },
      include: {
        certificates: { where: { status: "ACTIVE" } },
        maintenanceContracts: { where: { isActive: true }, orderBy: { endDate: "desc" } },
        qrCodes: { where: { isActive: true }, take: 1 },
        inspections: { orderBy: { conductedDate: "desc" }, take: 1 },
        maintenanceRecords: { orderBy: { performedDate: "desc" }, take: 1 },
        maintenanceCompliance: true,
        complianceIndicator: true,
      },
    });

    const items: { type: string; label: string; elevatorId: string; registryNumber: string; date?: Date }[] = [];
    const seen = new Set<string>();

    for (const elv of elevators) {
      const complianceView = resolveElevatorComplianceView({
        status: elv.status,
        maintenanceOrgId: elv.maintenanceOrgId,
        inspections: elv.inspections,
        maintenanceRecords: elv.maintenanceRecords,
        maintenanceCompliance: elv.maintenanceCompliance,
        complianceIndicator: elv.complianceIndicator,
        certificates: elv.certificates,
      });

      for (const gap of complianceView.gaps.filter((g) => g.level !== "info")) {
        const dedupeKey = `${elv.id}:${gap.key}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        items.push({
          type: gap.key,
          label: gap.title,
          elevatorId: elv.id,
          registryNumber: elv.registryNumber,
          date: gap.key.includes("expiring")
            ? (complianceView.snapshot.nextInspectionDate ??
              complianceView.snapshot.nextMaintenanceDueDate ??
              complianceView.snapshot.registrationCertificateExpiry ??
              undefined)
            : undefined,
        });
      }

      const regCert = elv.certificates.find((c) => c.type === "REGISTRATION");
      if (regCert?.expiryDate && regCert.expiryDate <= expiryThreshold && regCert.expiryDate >= now) {
        const key = `${elv.id}:certificate-expiring-window`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "certificate",
            label: "Certifikata skadon së shpejti",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: regCert.expiryDate,
          });
        }
      }

      const maintActive = elv.maintenanceContracts.find(
        (c) => c.serviceType === "MAINTENANCE" && c.status === "ACTIVE",
      );
      const inspActive = elv.maintenanceContracts.find(
        (c) => c.serviceType === "PERIODIC_INSPECTION" && c.status === "ACTIVE",
      );
      const maintPending = elv.maintenanceContracts.find(
        (c) => c.serviceType === "MAINTENANCE" && c.status === "PENDING",
      );
      const inspPending = elv.maintenanceContracts.find(
        (c) => c.serviceType === "PERIODIC_INSPECTION" && c.status === "PENDING",
      );

      if (!maintActive) {
        const key = `${elv.id}:missing-maintenance-contract`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "missing-maintenance-contract",
            label: "Mungon kontratë aktive mirëmbajtjeje",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
          });
        }
      }

      if (!inspActive) {
        const key = `${elv.id}:missing-inspection-contract`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "missing-inspection-contract",
            label: "Mungon kontratë kontrolli periodik (OM)",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
          });
        }
      }

      if (maintPending) {
        const key = `${elv.id}:pending-maintenance-contract`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "pending-maintenance-contract",
            label: "Kontratë mirëmbajtjeje - në pritje pranimi",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: maintPending.endDate ?? undefined,
          });
        }
      }

      if (inspPending) {
        const key = `${elv.id}:pending-inspection-contract`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "pending-inspection-contract",
            label: "Kontratë kontrolli periodik - në pritje pranimi",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: inspPending.endDate ?? undefined,
          });
        }
      }

      const contract = maintActive ?? elv.maintenanceContracts.find((c) => c.serviceType === "MAINTENANCE");
      if (contract?.endDate && contract.endDate <= expiryThreshold && contract.endDate >= now) {
        const key = `${elv.id}:maintenance-contract-expiring`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "maintenance-contract-expiring",
            label: "Kontrata e mirëmbajtjes skadon së shpejti",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: contract.endDate,
          });
        }
      } else if (contract?.endDate && contract.endDate < now && contract.status === "ACTIVE") {
        const key = `${elv.id}:maintenance-contract-expired`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "maintenance-contract-expired",
            label: "Kontrata e mirëmbajtjes ka skaduar",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: contract.endDate,
          });
        }
      }

      if (inspActive?.endDate && inspActive.endDate <= expiryThreshold && inspActive.endDate >= now) {
        const key = `${elv.id}:inspection-contract-expiring`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "inspection-contract-expiring",
            label: "Kontrata e kontrollit periodik skadon së shpejti",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: inspActive.endDate,
          });
        }
      } else if (inspActive?.endDate && inspActive.endDate < now) {
        const key = `${elv.id}:inspection-contract-expired`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "inspection-contract-expired",
            label: "Kontrata e kontrollit periodik ka skaduar",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
            date: inspActive.endDate,
          });
        }
      }

      if (!elv.qrCodes[0]?.placementPhotoDocumentId) {
        const key = `${elv.id}:qr_placement`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            type: "qr_placement",
            label: "Mungon fotografia e vendosjes së QR",
            elevatorId: elv.id,
            registryNumber: elv.registryNumber,
          });
        }
      }
    }

    return items.slice(0, 40);
  }

  static async syncComplianceNotifications(orgId: string) {
    const now = new Date();
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(expiryThreshold.getDate() + 30);
    const items = await this.getDeadlineItems(orgId, expiryThreshold, now);
    if (items.length === 0) return { created: 0, organizations: 0 };

    const elevatorIds = [...new Set(items.map((item) => item.elevatorId))];
    const elevators = await db.elevator.findMany({
      where: { id: { in: elevatorIds } },
      select: { id: true, maintenanceOrgId: true, certifierOrgId: true },
    });
    const elevatorById = new Map(elevators.map((e) => [e.id, e]));

    const byOrg = new Map<string, ReturnType<typeof OwnerComplianceNotificationService.alertsFromDeadlineItems>>();

    for (const item of items) {
      const elevator = elevatorById.get(item.elevatorId);
      const alert = OwnerComplianceNotificationService.alertsFromDeadlineItems([item])[0];
      if (!alert) continue;

      for (const targetOrgId of OwnerComplianceNotificationService.resolveStakeholderOrgIds({
        ownerOrgId: orgId,
        maintenanceOrgId: elevator?.maintenanceOrgId,
        certifierOrgId: elevator?.certifierOrgId,
        issueType: item.type,
      })) {
        const existing = byOrg.get(targetOrgId) ?? [];
        if (!existing.some((a) => a.dedupeKey === alert.dedupeKey)) {
          existing.push(alert);
          byOrg.set(targetOrgId, existing);
        }
      }
    }

    let created = 0;
    for (const [targetOrgId, alerts] of byOrg) {
      const result = await OwnerComplianceNotificationService.syncForOrganization(targetOrgId, alerts);
      created += result.created;
    }

    return { created, organizations: byOrg.size };
  }

  static async syncAllComplianceNotifications() {
    const orgRows = await db.elevator.findMany({
      where: { deletedAt: null, status: ElevatorStatus.ACTIVE },
      select: { ownerOrgId: true },
      distinct: ["ownerOrgId"],
    });

    let organizations = 0;
    let created = 0;

    for (const row of orgRows) {
      const result = await this.syncComplianceNotifications(row.ownerOrgId);
      organizations += 1;
      created += result.created;
    }

    return { organizations, created };
  }
}
