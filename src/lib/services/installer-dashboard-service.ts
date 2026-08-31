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
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";
import { stakeholderRequiresApplicationAction } from "@/lib/applications/stakeholder-required-action";
import { applicationReturnedToRoleWhere } from "@/lib/workflows/return-targets";
import { isDelegationRevokedForOrg } from "@/lib/delegation/delegation-revoked";
import {
  buildRegistrationPhaseInput,
  registrationPhasePath,
  resolveRegistrationPhase,
} from "@/lib/registration/phase-router";

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
      resolveRegistrationPhase(buildRegistrationPhaseInput(app), ROLE_CODES.INSTALLER),
    );
  }
  return `/portal/applications/${app.id}`;
}

export class InstallerDashboardService {
  static async getDashboard(ctx: AuthContext) {
    if (!hasServiceCapability(ctx, "install")) {
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
          AND: [baseWhere, applicationReturnedToRoleWhere(ReturnTargetRole.INSTALLER)],
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
                      ApplicationStatus.CERTIFIER_ACCEPTED,
                    ],
                  },
                },
              ],
            },
          ],
        },
        include: {
          data: { include: { municipality: true } },
          ownerOrg: true,
          delegations: {
            where: { organizationId: orgId, accessType: DelegationType.INSTALLER },
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
          delegations: {
            where: { organizationId: orgId, accessType: DelegationType.INSTALLER },
            include: { organization: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const requiredActions = actionApps
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
          ROLE_CODES.INSTALLER,
          orgId,
        ),
      )
      .map((app) => {
        const delegation = app.delegations[0];
        const isInvite =
          delegation?.status === DelegationStatus.INVITED ||
          delegation?.status === DelegationStatus.PENDING;
        const phase = resolveRegistrationPhase(buildRegistrationPhaseInput(app), ROLE_CODES.INSTALLER);
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
                ROLE_CODES.INSTALLER,
                orgId,
              ),
          severity: "warning" as const,
        };
      });

    return {
      cards: { invited, accepted, technicalPending, technicalCompleted, returned },
      requiredActions,
      recentApplications: recentApps.map((app) => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        owner: app.ownerOrg.name,
        address: app.data?.buildingAddress ?? "-",
        municipality: app.data?.municipality?.nameSq ?? "-",
        status: app.status,
        type: app.type,
        delegationRevoked: isDelegationRevokedForOrg(app.delegations, ROLE_CODES.INSTALLER, orgId, app),
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
          ROLE_CODES.INSTALLER,
          orgId,
        ),
        href: taskHref(app),
      })),
    };
  }

  static async listTechnicalTasks(ctx: AuthContext) {
    if (!hasServiceCapability(ctx, "install")) throw new Error("Leje e refuzuar.");
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
