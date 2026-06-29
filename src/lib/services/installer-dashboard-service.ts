import {
  ApplicationStatus,
  DelegationStatus,
  DelegationType,
  ReturnTargetRole,
} from "@prisma/client";
import { db } from "@/lib/db";
import { ApplicationService } from "@/lib/services/application-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { registrationPhasePath, resolveRegistrationPhase } from "@/lib/registration/phase-router";
import { applicationReturnedToRoleWhere } from "@/lib/workflows/return-targets";

function installerAppWhere(orgId: string) {
  return {
    deletedAt: null,
    OR: [
      { installerOrgId: orgId },
      {
        delegations: {
          some: { organizationId: orgId, accessType: DelegationType.INSTALLER },
        },
      },
    ],
  };
}

function taskHref(app: {
  id: string;
  type: import("@prisma/client").ApplicationType;
  status: ApplicationStatus;
  returnToRole?: ReturnTargetRole | null;
  installerOrgId?: string | null;
  certifierOrgId?: string | null;
}) {
  if (app.type === "NEW_REGISTRATION") {
    return registrationPhasePath(app.id, resolveRegistrationPhase(app, ROLE_CODES.INSTALLER));
  }
  return `/portal/applications/${app.id}`;
}

export class InstallerDashboardService {
  static async getDashboard(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.INSTALLER) {
      throw new Error("Vetëm instaluesi mund të shohë këtë panel.");
    }

    const orgId = ctx.activeOrgId;
    const baseWhere = installerAppWhere(orgId);

    const [
      invited,
      accepted,
      technicalPending,
      technicalCompleted,
      returned,
      uploadedDocs,
      actionApps,
      recentApps,
    ] = await Promise.all([
      db.applicationDelegation.count({
        where: {
          organizationId: orgId,
          accessType: DelegationType.INSTALLER,
          status: { in: [DelegationStatus.INVITED, DelegationStatus.PENDING] },
        },
      }),
      db.applicationDelegation.count({
        where: {
          organizationId: orgId,
          accessType: DelegationType.INSTALLER,
          status: DelegationStatus.ACCEPTED,
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          status: {
            in: [
              ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
              ApplicationStatus.PENDING_INSTALLER,
              ApplicationStatus.INSTALLER_ACCEPTED,
            ],
          },
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          status: {
            in: [
              ApplicationStatus.TECHNICAL_DATA_COMPLETED,
              ApplicationStatus.INSTALLER_COMPLETED,
            ],
          },
        },
      }),
      db.application.count({
        where: {
          ...baseWhere,
          OR: [applicationReturnedToRoleWhere(ReturnTargetRole.INSTALLER)],
        },
      }),
      db.document.count({
        where: {
          deletedAt: null,
          uploadedBy: {
            memberships: {
              some: { organizationId: orgId, deactivatedAt: null },
            },
          },
        },
      }),
      db.application.findMany({
        where: {
          ...baseWhere,
          OR: [
            {
              delegations: {
                some: {
                  organizationId: orgId,
                  accessType: DelegationType.INSTALLER,
                  status: { in: [DelegationStatus.INVITED, DelegationStatus.PENDING] },
                },
              },
            },
            applicationReturnedToRoleWhere(ReturnTargetRole.INSTALLER),
            {
              status: {
                in: [
                  ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
                  ApplicationStatus.INSTALLER_ACCEPTED,
                  ApplicationStatus.PENDING_INSTALLER,
                ],
              },
            },
          ],
        },
        include: {
          data: { include: { municipality: true } },
          ownerOrg: true,
          delegations: { where: { organizationId: orgId, accessType: DelegationType.INSTALLER } },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      db.application.findMany({
        where: baseWhere,
        include: {
          data: { include: { municipality: true } },
          ownerOrg: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const requiredActions = actionApps.map((app) => {
      const delegation = app.delegations[0];
      const isInvite =
        delegation?.status === DelegationStatus.INVITED ||
        delegation?.status === DelegationStatus.PENDING;
      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        owner: app.ownerOrg.name,
        address: app.data?.buildingAddress ?? "-",
        status: app.status,
        type: app.type,
        dueDate: delegation?.expiresAt ?? null,
        href: isInvite ? `/portal/applications/${app.id}` : taskHref(app),
        actionLabel: isInvite
          ? "Prano ftesën"
          : app.status === ApplicationStatus.RETURNED
            ? "Korrigjo të dhënat"
            : "Plotëso të dhënat teknike",
        severity: (isInvite || app.status === ApplicationStatus.RETURNED
          ? "warning"
          : "info") as "info" | "warning" | "danger",
      };
    });

    return {
      cards: { invited, accepted, technicalPending, technicalCompleted, returned, uploadedDocs },
      requiredActions,
      recentApplications: recentApps.map((app) => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        owner: app.ownerOrg.name,
        address: app.data?.buildingAddress ?? "-",
        municipality: app.data?.municipality?.nameSq ?? "-",
        status: app.status,
        type: app.type,
        nextAction: ApplicationService.getNextRequiredAction(app, ROLE_CODES.INSTALLER),
        href: taskHref(app),
      })),
    };
  }

  static async listTechnicalTasks(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.INSTALLER) throw new Error("Leje e refuzuar.");
    const orgId = ctx.activeOrgId;
    return db.application.findMany({
      where: installerAppWhere(orgId),
      include: {
        data: { include: { municipality: true } },
        ownerOrg: true,
        delegations: { where: { organizationId: orgId, accessType: DelegationType.INSTALLER } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
