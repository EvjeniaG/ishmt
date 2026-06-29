import {
  DataUpdateType,
  DelegationStatus,
  DelegationType,
  OrgType,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { NotificationService } from "@/lib/services/notification-service";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";

const INVITE_STATUSES: DelegationStatus[] = [DelegationStatus.PENDING, DelegationStatus.INVITED];

export class OwnershipTransferService {
  static recipientDelegation(
    delegations: { accessType: DelegationType; organizationId: string; status: DelegationStatus; organization?: { name: string; nipt: string | null } }[],
  ) {
    return delegations.find((d) => d.accessType === DelegationType.OWNERSHIP_RECIPIENT);
  }

  static async inviteRecipient(
    ctx: AuthContext,
    applicationId: string,
    targetIdentifier: string,
    reason: string,
  ) {
    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personi përgjegjës aktual i ashensorit mund të dërgojë ftesën e transferimit.");
    }

    const nipt = targetIdentifier.trim().toUpperCase();
    if (nipt.length < 5) throw new Error("NIPT/NID i marrësit është i pavlefshëm.");
    if (reason.trim().length < 10) {
      throw new Error("Arsyeja e transferimit duhet të ketë të paktën 10 karaktere.");
    }

    const application = await db.application.findFirst({
      where: { id: applicationId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
      include: {
        data: true,
        ownerOrg: true,
        targetElevator: true,
        delegations: true,
      },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (application.data?.updateType !== DataUpdateType.OWNERSHIP_TRANSFER) {
      throw new Error("Ky aplikim nuk është transferim pronësie.");
    }
    if (!application.targetElevator) throw new Error("Ashensori i synuar nuk u gjet.");

    const currentNipt = application.ownerOrg.nipt?.toUpperCase();
    if (currentNipt && nipt === currentNipt) {
      throw new Error("Marrësi nuk mund të jetë i njëjti subjekt përgjegjës.");
    }

    const recipientOrg = await db.organization.findFirst({
      where: {
        type: OrgType.OWNER,
        nipt,
        deletedAt: null,
        status: "ACTIVE",
      },
    });
    if (!recipientOrg) {
      throw new Error("Nuk u gjet subjekt i personit përgjegjës të ashensorit aktiv me këtë NIPT/NID në regjistr.");
    }
    if (recipientOrg.id === application.ownerOrgId) {
      throw new Error("Marrësi nuk mund të jetë personi përgjegjës aktual i ashensorit.");
    }

    const accepted = application.delegations.find(
      (d) =>
        d.accessType === DelegationType.OWNERSHIP_RECIPIENT &&
        d.status === DelegationStatus.ACCEPTED,
    );
    if (accepted && accepted.organizationId !== recipientOrg.id) {
      throw new Error("Marrësi ka pranuar tashmë - krijoni aplikim të ri për marrës tjetër.");
    }

    const oldValue = application.ownerOrg.nipt ?? application.ownerOrg.name;
    const changes: FieldChange[] = [
      {
        field: "responsibleEntityIdentifier",
        label: "NIPT/NID i marrësit",
        oldValue,
        newValue: nipt,
        reason: reason.trim(),
      },
    ];

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    await db.$transaction(async (tx) => {
      await tx.applicationData.update({
        where: { applicationId },
        data: {
          updateFields: changes,
          responsibleEntityIdentifier: nipt,
          responsibleEntityName: recipientOrg.name,
        },
      });

      const stale = application.delegations.filter(
        (d) =>
          d.accessType === DelegationType.OWNERSHIP_RECIPIENT &&
          d.organizationId !== recipientOrg.id,
      );
      for (const d of stale) {
        await tx.applicationDelegation.update({
          where: { id: d.id },
          data: { status: DelegationStatus.REVOKED },
        });
      }

      await tx.applicationDelegation.upsert({
        where: {
          applicationId_organizationId_accessType: {
            applicationId,
            organizationId: recipientOrg.id,
            accessType: DelegationType.OWNERSHIP_RECIPIENT,
          },
        },
        update: {
          status: DelegationStatus.INVITED,
          invitedAt: new Date(),
          invitedById: ctx.userId,
          expiresAt,
        },
        create: {
          applicationId,
          organizationId: recipientOrg.id,
          accessType: DelegationType.OWNERSHIP_RECIPIENT,
          status: DelegationStatus.INVITED,
          invitedById: ctx.userId,
          expiresAt,
        },
      });
    });

    await NotificationService.notifyOrgMembers(recipientOrg.id, {
      title: "Ftesë transferimi pronësie",
      body: `${application.ownerOrg.name} kërkon t'ju transferojë ashensorin ${application.targetElevator!.registryNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return { recipientOrgId: recipientOrg.id, recipientName: recipientOrg.name };
  }

  static async respond(ctx: AuthContext, applicationId: string, accept: boolean) {
    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personi përgjegjës i ashensorit mund të përgjigjet ndaj ftesës së transferimit.");
    }

    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: {
        ownerOrg: true,
        targetElevator: true,
        delegations: { include: { organization: true } },
      },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegation = application.delegations.find(
      (d) =>
        d.accessType === DelegationType.OWNERSHIP_RECIPIENT &&
        d.organizationId === ctx.activeOrgId,
    );
    if (!delegation) throw new Error("Nuk keni ftesë aktive për këtë transferim.");
    if (!INVITE_STATUSES.includes(delegation.status)) {
      throw new Error("Ky transferim është përgjigjur tashmë.");
    }

    await db.applicationDelegation.update({
      where: { id: delegation.id },
      data: {
        status: accept ? DelegationStatus.ACCEPTED : DelegationStatus.REJECTED,
        acceptedAt: accept ? new Date() : null,
      },
    });

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: accept ? "Transferimi u pranua" : "Transferimi u refuzua",
      body: accept
        ? `${delegation.organization.name} pranoi transferimin e ashensorit ${application.targetElevator?.registryNumber ?? ""}. Mund të parashtroni te ISHMT.`
        : `${delegation.organization.name} refuzoi transferimin e ashensorit ${application.targetElevator?.registryNumber ?? ""}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return { accepted: accept };
  }

  static async assertReadyForIshmt(applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true, delegations: true },
    });
    if (!application?.data) return;

    if (application.data.updateType !== DataUpdateType.OWNERSHIP_TRANSFER) return;

    const delegation = application.delegations.find(
      (d) => d.accessType === DelegationType.OWNERSHIP_RECIPIENT,
    );
    if (!delegation) {
      throw new Error("Dërgoni ftesën te marrësi me NIPT/NID para parashtrimit.");
    }
    if (delegation.status === DelegationStatus.REJECTED) {
      throw new Error("Marrësi refuzoi transferimin. Zgjidhni marrës tjetër ose anuloni aplikimin.");
    }
    if (delegation.status !== DelegationStatus.ACCEPTED) {
      throw new Error("Në pritje të pranimit nga marrësi - parashtrimi te ISHMT bllokohet.");
    }
  }
}
