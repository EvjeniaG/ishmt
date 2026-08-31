import {
  ApplicationType,
  AuditAction,
  DelegationStatus,
  DelegationType,
  MaintenanceContractStatus,
} from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { assertTransition } from "@/lib/workflows/application-workflow";
import { ApplicationService } from "@/lib/services/application-service";
import { NotificationService } from "@/lib/services/notification-service";
import { delegationRevocationReasonSchema } from "@/lib/validations/delegation-revocation";

const REVOKABLE_DELEGATION_STATUSES: DelegationStatus[] = [
  DelegationStatus.PENDING,
  DelegationStatus.INVITED,
  DelegationStatus.ACCEPTED,
];

function parseReason(reason: string) {
  const parsed = delegationRevocationReasonSchema.safeParse({ reason });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Arsyeja nuk është e vlefshme.");
  }
  return parsed.data.reason;
}

function assertOwner(ctx: AuthContext) {
  if (ctx.roleCode !== ROLE_CODES.OWNER) {
    throw new Error("Vetëm personi përgjegjës i ashensorit mund të tërheqë ftesën.");
  }
}

export class DelegationRevocationService {
  static async revokeApplicationInstaller(ctx: AuthContext, applicationId: string, reason: string) {
    assertOwner(ctx);
    const trimmedReason = parseReason(reason);

    const application = await db.application.findFirst({
      where: { id: applicationId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
      include: { delegations: { include: { organization: true } } },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegation = application.delegations.find((d) => d.accessType === DelegationType.INSTALLER);
    if (!delegation || !REVOKABLE_DELEGATION_STATUSES.includes(delegation.status)) {
      throw new Error("Nuk ka ftesë aktive instaluesi për tërheqje.");
    }

    const toStatus = assertTransition(
      application.type,
      application.status,
      "REVOKE_INSTALLER_DELEGATION",
      ctx.roleCode,
    );

    const orgName = delegation.organization.name;
    const orgId = delegation.organizationId;

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.REVOKED },
      });
      await tx.application.update({
        where: { id: applicationId },
        data: { status: toStatus, installerOrgId: null },
      });
      await tx.applicationWorkflowHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus,
          action: "INSTALLER_DELEGATION_REVOKED",
          actorId: ctx.userId,
          comment: trimmedReason,
          metadata: {
            accessType: DelegationType.INSTALLER,
            organizationId: orgId,
            organizationName: orgName,
          },
        },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: applicationId,
          afterState: {
            action: "INSTALLER_DELEGATION_REVOKED",
            reason: trimmedReason,
            organizationId: orgId,
          },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(orgId, {
      title: "Ftesa u tërhoq",
      body: `Ftesa për aplikimin ${application.applicationNumber} u tërhoq. Arsye: ${trimmedReason}`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async revokeApplicationCertifier(ctx: AuthContext, applicationId: string, reason: string) {
    assertOwner(ctx);
    const trimmedReason = parseReason(reason);

    const application = await db.application.findFirst({
      where: { id: applicationId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
      include: { delegations: { include: { organization: true } } },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegation = application.delegations.find((d) => d.accessType === DelegationType.CERTIFIER);
    if (!delegation || !REVOKABLE_DELEGATION_STATUSES.includes(delegation.status)) {
      throw new Error("Nuk ka ftesë aktive certifikuesi për tërheqje.");
    }

    const toStatus = assertTransition(
      application.type,
      application.status,
      "REVOKE_CERTIFIER_DELEGATION",
      ctx.roleCode,
    );

    const orgName = delegation.organization.name;
    const orgId = delegation.organizationId;

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.REVOKED },
      });
      await tx.application.update({
        where: { id: applicationId },
        data: { status: toStatus, certifierOrgId: null },
      });
      await tx.applicationWorkflowHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus,
          action: "CERTIFIER_DELEGATION_REVOKED",
          actorId: ctx.userId,
          comment: trimmedReason,
          metadata: {
            accessType: DelegationType.CERTIFIER,
            organizationId: orgId,
            organizationName: orgName,
          },
        },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: applicationId,
          afterState: {
            action: "CERTIFIER_DELEGATION_REVOKED",
            reason: trimmedReason,
            organizationId: orgId,
          },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(orgId, {
      title: "Ftesa u tërhoq",
      body: `Ftesa për aplikimin ${application.applicationNumber} u tërhoq. Arsye: ${trimmedReason}`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async revokeOwnershipRecipient(ctx: AuthContext, applicationId: string, reason: string) {
    assertOwner(ctx);
    const trimmedReason = parseReason(reason);

    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        ownerOrgId: ctx.activeOrgId,
        deletedAt: null,
        type: ApplicationType.DATA_UPDATE,
      },
      include: {
        delegations: { include: { organization: true } },
        targetElevator: true,
      },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegation = application.delegations.find(
      (d) => d.accessType === DelegationType.OWNERSHIP_RECIPIENT,
    );
    if (!delegation || !REVOKABLE_DELEGATION_STATUSES.includes(delegation.status)) {
      throw new Error("Nuk ka ftesë aktive transferimi për tërheqje.");
    }

    const orgName = delegation.organization.name;
    const orgId = delegation.organizationId;

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.REVOKED },
      });
      await tx.applicationWorkflowHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: application.status,
          action: "OWNERSHIP_DELEGATION_REVOKED",
          actorId: ctx.userId,
          comment: trimmedReason,
          metadata: {
            accessType: DelegationType.OWNERSHIP_RECIPIENT,
            organizationId: orgId,
            organizationName: orgName,
          },
        },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: applicationId,
          afterState: {
            action: "OWNERSHIP_DELEGATION_REVOKED",
            reason: trimmedReason,
            organizationId: orgId,
          },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(orgId, {
      title: "Ftesa e transferimit u tërhoq",
      body: `Ftesa për ashensorin ${application.targetElevator?.registryNumber ?? ""} u tërhoq. Arsye: ${trimmedReason}`,
      entityType: "application",
      entityId: applicationId,
    });

    return { ok: true as const };
  }

  static async revokePendingMaintenanceContract(ctx: AuthContext, contractId: string, reason: string) {
    assertOwner(ctx);
    const trimmedReason = parseReason(reason);

    const contract = await db.maintenanceContract.findFirst({
      where: { id: contractId, status: MaintenanceContractStatus.PENDING },
      include: {
        elevator: { select: { id: true, registryNumber: true, ownerOrgId: true } },
        maintenanceOrg: { select: { id: true, name: true } },
      },
    });
    if (!contract) throw new Error("Kontrata në pritje nuk u gjet.");
    if (contract.elevator.ownerOrgId !== ctx.activeOrgId) {
      throw new Error("Nuk keni leje për të tërhequr këtë ftesë.");
    }

    await db.$transaction(async (tx) => {
      await tx.maintenanceContract.update({
        where: { id: contract.id },
        data: {
          status: MaintenanceContractStatus.TERMINATED,
          isActive: false,
          rejectionReason: trimmedReason,
          respondedAt: new Date(),
        },
      });
      await tx.elevatorDelegationHistory.updateMany({
        where: {
          elevatorId: contract.elevatorId,
          organizationId: contract.maintenanceOrgId,
          delegationType: DelegationType.MAINTENANCE,
          status: DelegationStatus.PENDING,
        },
        data: { status: DelegationStatus.REVOKED },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "maintenance_contract",
          entityId: contract.id,
          afterState: {
            action: "MAINTENANCE_DELEGATION_REVOKED",
            elevatorId: contract.elevatorId,
            organizationId: contract.maintenanceOrgId,
            reason: trimmedReason,
          },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(contract.maintenanceOrgId, {
      title: "Ftesa u tërhoq",
      body: `Ftesa për ashensorin ${contract.elevator.registryNumber} u tërhoq. Arsye: ${trimmedReason}`,
      entityType: "elevator",
      entityId: contract.elevatorId,
    });

    return { ok: true as const };
  }
}
