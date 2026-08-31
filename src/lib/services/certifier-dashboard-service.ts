import {
  ApplicationStatus,
  ConformityResult,
  DelegationStatus,
  DelegationType,
  MaintenanceContractStatus,
  ReturnTargetRole,
} from "@prisma/client";
import { certifierOrgHasMaintenanceAssignments } from "@/lib/certifier/certifier-maintenance-access";
import { db } from "@/lib/db";
import { ApplicationService } from "@/lib/services/application-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";
import { registrationPhasePath, resolveRegistrationPhase, buildRegistrationPhaseInput, POST_CERTIFIER_WORK_STATUSES, CERTIFIER_IN_PROGRESS_STATUSES, CERTIFIER_AWAITING_START_STATUSES, CERTIFIER_ACTIVE_WORK_STATUSES } from "@/lib/registration/phase-router";
import { applicationReturnedToRoleWhere } from "@/lib/workflows/return-targets";
import { isDelegationRevokedForOrg } from "@/lib/delegation/delegation-revoked";
import { stakeholderRequiresApplicationAction } from "@/lib/applications/stakeholder-required-action";

function certifierAppWhere(orgId: string) {
  return {
    deletedAt: null,
    OR: [
      { certifierOrgId: orgId },
      {
        delegations: {
          some: { organizationId: orgId, accessType: DelegationType.CERTIFIER },
        },
      },
    ],
    status: {
      notIn: [
        ApplicationStatus.DRAFT,
        ApplicationStatus.PENDING_INSTALLER,
        ApplicationStatus.CANCELLED,
      ],
    },
  };
}

function taskHref(app: {
  id: string;
  type: import("@prisma/client").ApplicationType;
  status: ApplicationStatus;
  returnToRole?: ReturnTargetRole | null;
  installerOrgId?: string | null;
  certifierOrgId?: string | null;
  delegations?: {
    accessType: DelegationType;
    organizationId: string;
    status: DelegationStatus;
    expiresAt?: Date | null;
  }[];
  data?: { registrationExtendedData?: unknown } | null;
}) {
  if (app.type === "NEW_REGISTRATION") {
    return registrationPhasePath(
      app.id,
      resolveRegistrationPhase(buildRegistrationPhaseInput(app), ROLE_CODES.CERTIFIER),
    );
  }
  return `/portal/applications/${app.id}`;
}

export class CertifierDashboardService {
  static async getDashboard(ctx: AuthContext) {
    if (!hasServiceCapability(ctx, "om")) {
      throw new Error("Vetëm certifikuesi / OM mund të shohë këtë panel.");
    }

    const orgId = ctx.activeOrgId;
    const baseWhere = certifierAppWhere(orgId);
    const hasMaintenanceAssignments = await certifierOrgHasMaintenanceAssignments(orgId);

    const [
      inProgress,
      certificationActive,
      completed,
      returned,
      nonConform,
      actionApps,
      recentApps,
      pendingInspectionContracts,
      pendingMaintenanceContracts,
      activeMaintenanceContracts,
      activeInspectionContracts,
      installationsPending,
    ] = await Promise.all([
      db.application.count({
        where: {
          ...baseWhere,
          status: { in: CERTIFIER_IN_PROGRESS_STATUSES },
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          status: { in: CERTIFIER_ACTIVE_WORK_STATUSES },
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          status: { in: POST_CERTIFIER_WORK_STATUSES },
        },
      }),
      db.application.count({
        where: {
          AND: [baseWhere, applicationReturnedToRoleWhere(ReturnTargetRole.CERTIFIER)],
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          data: { conformityResult: ConformityResult.NON_CONFORM },
        },
      }),
      db.application.findMany({
        where: {
          AND: [
            baseWhere,
            {
              OR: [
                {
                  delegations: {
                    some: {
                      organizationId: orgId,
                      accessType: DelegationType.CERTIFIER,
                      status: { in: [DelegationStatus.INVITED, DelegationStatus.PENDING] },
                    },
                  },
                },
                applicationReturnedToRoleWhere(ReturnTargetRole.CERTIFIER),
                {
                  status: { in: CERTIFIER_IN_PROGRESS_STATUSES },
                },
              ],
            },
          ],
        },
        include: {
          data: { include: { municipality: true } },
          ownerOrg: true,
          installerOrg: true,
          delegations: {
            where: { organizationId: orgId, accessType: DelegationType.CERTIFIER },
            include: { organization: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      db.application.findMany({
        where: baseWhere,
        include: {
          data: { include: { municipality: true } },
          ownerOrg: true,
          installerOrg: true,
          delegations: {
            where: { organizationId: orgId, accessType: DelegationType.CERTIFIER },
            include: { organization: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      db.maintenanceContract.findMany({
        where: {
          maintenanceOrgId: orgId,
          status: MaintenanceContractStatus.PENDING,
          serviceType: "PERIODIC_INSPECTION",
        },
        include: {
          elevator: { include: { municipality: true, ownerOrg: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.maintenanceContract.findMany({
        where: {
          maintenanceOrgId: orgId,
          status: MaintenanceContractStatus.PENDING,
          serviceType: "MAINTENANCE",
        },
        include: {
          elevator: { include: { municipality: true, ownerOrg: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      hasMaintenanceAssignments
        ? db.maintenanceContract.count({
            where: {
              maintenanceOrgId: orgId,
              status: MaintenanceContractStatus.ACTIVE,
              serviceType: "MAINTENANCE",
            },
          })
        : Promise.resolve(0),
      db.maintenanceContract.count({
        where: {
          maintenanceOrgId: orgId,
          status: MaintenanceContractStatus.ACTIVE,
          serviceType: "PERIODIC_INSPECTION",
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          status: { in: CERTIFIER_AWAITING_START_STATUSES },
        },
      }),
    ]);

    const requiredActions = [
      ...(hasMaintenanceAssignments
        ? pendingMaintenanceContracts.map((c) => ({
            id: `maint-contract-${c.id}`,
            applicationNumber: c.elevator?.registryNumber ?? "-",
            owner: c.elevator?.ownerOrg?.name ?? "-",
            address: c.elevator?.buildingAddress ?? "-",
            status: "PENDING_CONTRACT" as const,
            type: "MAINTENANCE" as const,
            dueDate: c.endDate,
            href: c.elevatorId
              ? `/portal/elevators/${c.elevatorId}?tab=maintenance`
              : "/portal/omi/kontratat",
            actionLabel: "Ngarko kontratën dhe prano",
            severity: "warning" as const,
          }))
        : []),
      ...pendingInspectionContracts.map((c) => ({
        id: `contract-${c.id}`,
        applicationNumber: c.elevator?.registryNumber ?? "-",
        owner: c.elevator?.ownerOrg?.name ?? "-",
        address: c.elevator?.buildingAddress ?? "-",
        status: "PENDING_CONTRACT" as const,
        type: "PERIODIC_INSPECTION" as const,
        dueDate: c.endDate,
        href: `/portal/omi/kontratat-kontrolli?contract=${c.id}`,
        actionLabel: "Ngarko kontratën dhe prano",
        severity: "warning" as const,
      })),
      ...actionApps
        .filter((app) => ApplicationService.canAccess(ctx, app))
        .filter((app) =>
          stakeholderRequiresApplicationAction(
            {
              id: app.id,
              type: app.type,
              status: app.status,
              returnToRole: app.returnToRole,
              returnToRoles: app.returnToRoles,
              installerOrgId: app.installerOrgId,
              certifierOrgId: app.certifierOrgId,
              delegations: app.delegations,
              registrationExtendedData: app.data?.registrationExtendedData,
            },
            ROLE_CODES.CERTIFIER,
            orgId,
          ),
        )
        .map((app) => {
      const delegation = app.delegations[0];
      const isInvite =
        delegation?.status === DelegationStatus.INVITED ||
        delegation?.status === DelegationStatus.PENDING;
      const actionLabel = isInvite
        ? "Prano ftesën"
        : ApplicationService.getNextRequiredAction(
            {
              id: app.id,
              type: app.type,
              status: app.status,
              returnToRole: app.returnToRole,
              returnToRoles: app.returnToRoles,
              installerOrgId: app.installerOrgId,
              certifierOrgId: app.certifierOrgId,
              delegations: app.delegations,
              registrationExtendedData: app.data?.registrationExtendedData,
            },
            ROLE_CODES.CERTIFIER,
            orgId,
          );
      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        owner: app.ownerOrg.name,
        address: app.data?.buildingAddress ?? "-",
        status: app.status,
        type: app.type,
        dueDate: delegation?.expiresAt ?? null,
        href: isInvite ? `/portal/applications/${app.id}` : taskHref(app),
        actionLabel,
        severity: "warning" as const,
      };
      }),
    ].slice(0, 15);

    const certificationPending = inProgress + returned;
    const inspectionPending = pendingInspectionContracts.length;
    const maintenancePending = hasMaintenanceAssignments ? pendingMaintenanceContracts.length : 0;

    return {
      hasMaintenanceAssignments,
      cards: {
        certifikim: {
          value: completed,
          accent:
            certificationPending > 0
              ? ("warning" as const)
              : completed > 0
                ? ("success" as const)
                : ("primary" as const),
          subtitle:
            certificationPending > 0
              ? `${certificationActive} në certifikim · ${installationsPending} ftesa · ${returned} të kthyera${nonConform > 0 ? ` · ${nonConform} jo konform` : ""}`
              : "Certifikime të përfunduara nga organizata juaj",
        },
        instalime: {
          value: installationsPending,
          accent: installationsPending > 0 ? ("warning" as const) : ("primary" as const),
          subtitle:
            installationsPending > 0
              ? "Në pritje të pranimit të ftesës për certifikim"
              : "Nuk ka instalime në pritje të certifikimit",
        },
        mirembajtje: hasMaintenanceAssignments
          ? {
              value: maintenancePending + activeMaintenanceContracts,
              accent: maintenancePending > 0 ? ("warning" as const) : ("success" as const),
              subtitle:
                maintenancePending > 0
                  ? `${maintenancePending} ftesa · ${activeMaintenanceContracts} aktive`
                  : `${activeMaintenanceContracts} kontrata aktive`,
            }
          : null,
        inspektime: {
          value: inspectionPending + activeInspectionContracts,
          accent: inspectionPending > 0 ? ("warning" as const) : ("primary" as const),
          subtitle:
            inspectionPending > 0
              ? `${inspectionPending} kontrata në pritje · ${activeInspectionContracts} aktive`
              : `${activeInspectionContracts} kontrata aktive OM`,
        },
      },
      requiredActions,
      recentApplications: recentApps.map((app) => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        owner: app.ownerOrg.name,
        installer: app.installerOrg?.name ?? "-",
        address: app.data?.buildingAddress ?? "-",
        status: app.status,
        type: app.type,
        delegationRevoked: isDelegationRevokedForOrg(app.delegations, ROLE_CODES.CERTIFIER, orgId, app),
        nextAction: ApplicationService.getNextRequiredAction(
          {
            id: app.id,
            type: app.type,
            status: app.status,
            returnToRole: app.returnToRole,
            returnToRoles: app.returnToRoles,
            installerOrgId: app.installerOrgId,
            certifierOrgId: app.certifierOrgId,
            delegations: app.delegations,
            registrationExtendedData: app.data?.registrationExtendedData,
          },
          ROLE_CODES.CERTIFIER,
          orgId,
        ),
        href: taskHref(app),
      })),
    };
  }

  static async listCertificationTasks(ctx: AuthContext) {
    if (!hasServiceCapability(ctx, "om")) throw new Error("Leje e refuzuar.");
    const orgId = ctx.activeOrgId;
    return db.application.findMany({
      where: certifierAppWhere(orgId),
      include: {
        data: { include: { municipality: true } },
        ownerOrg: true,
        installerOrg: true,
        delegations: { where: { organizationId: orgId, accessType: DelegationType.CERTIFIER } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
