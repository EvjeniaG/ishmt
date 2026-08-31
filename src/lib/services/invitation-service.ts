import { createHash, randomBytes } from "crypto";
import { AuditAction, InvitationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import { hashPassword } from "@/lib/auth/password";
import type { RoleCode } from "@/lib/constants/roles";
import { isRoleValidForOrgType } from "@/lib/constants/org-role-map";
import { MembershipService } from "@/lib/services/membership-service";

const INVITATION_EXPIRY_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export class InvitationService {
  static async createInvitation(input: {
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleCode: RoleCode;
    invitedById: string;
  }) {
    const email = input.email.toLowerCase().trim();

    const org = await db.organization.findUnique({ where: { id: input.organizationId } });
    if (!org) throw new Error("Organizata nuk u gjet.");

    const role = await db.authRole.findUnique({ where: { code: input.roleCode } });
    if (!role || !isRoleValidForOrgType(input.roleCode, org)) {
      throw new Error("Roli nuk është i vlefshëm për këtë organizatë.");
    }

    const existingPending = await db.orgInvitation.findFirst({
      where: {
        organizationId: org.id,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPending) {
      throw new Error("Ekziston tashmë një ftesë aktive për këtë email.");
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await db.$transaction(async (tx) => {
      const record = await tx.orgInvitation.create({
        data: {
          organizationId: org.id,
          email,
          firstName: input.firstName,
          lastName: input.lastName,
          roleId: role.id,
          tokenHash,
          invitedById: input.invitedById,
          expiresAt,
        },
      });

      await AuditService.log(
        {
          actorId: input.invitedById,
          action: AuditAction.CREATE,
          entityType: "org_invitation",
          entityId: record.id,
          afterState: { email, organizationId: org.id, roleCode: input.roleCode },
        },
        tx,
      );

      return record;
    });

    if (process.env.NODE_ENV !== "production") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      console.log("\n=== ORGANIZATION INVITATION (dev) ===");
      console.log(`Email: ${email}`);
      console.log(`Organization: ${org.name}`);
      console.log(`URL: ${baseUrl}/auth/accept-invitation?token=${rawToken}`);
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log("=====================================\n");
    }

    return { invitation, rawToken };
  }

  static async getByToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const invitation = await db.orgInvitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!invitation) return null;

    if (invitation.status === InvitationStatus.PENDING && invitation.expiresAt < new Date()) {
      await db.orgInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      return { ...invitation, status: InvitationStatus.EXPIRED };
    }

    return invitation;
  }

  static async acceptInvitation(input: {
    rawToken: string;
    password?: string;
    userId?: string;
  }) {
    const invitation = await this.getByToken(input.rawToken);

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new Error("Ftesa është e pavlefshme, e skaduar ose e përdorur.");
    }

    return db.$transaction(async (tx) => {
      let userId = input.userId;

      if (!userId) {
        if (!input.password) {
          throw new Error("Fjalëkalimi është i detyrueshëm për përdorues të ri.");
        }

        const existing = await tx.authUser.findUnique({ where: { email: invitation.email } });

        if (existing) {
          throw new Error("Ky email ekziston. Hyni në sistem për të pranuar ftesën.");
        }

        const user = await tx.authUser.create({
          data: {
            email: invitation.email,
            passwordHash: await hashPassword(input.password),
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            emailVerified: true,
          },
        });
        userId = user.id;
      } else {
        const user = await tx.authUser.findUnique({ where: { id: userId } });
        if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
          throw new Error("Email i llogarisë nuk përputhet me ftesën.");
        }
      }

      await tx.orgMembership.upsert({
        where: {
          userId_organizationId_roleId: {
            userId,
            organizationId: invitation.organizationId,
            roleId: invitation.roleId,
          },
        },
        update: { deactivatedAt: null, isPrimary: true },
        create: {
          userId,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId,
          isPrimary: true,
        },
      });

      await MembershipService.grantCapabilityMemberships(tx, userId, invitation.organization, {
        primaryRoleCode: invitation.role.code as RoleCode,
      });

      const updated = await tx.orgInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      });

      await AuditService.log(
        {
          actorId: userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "org_invitation",
          entityId: invitation.id,
          afterState: { status: InvitationStatus.ACCEPTED },
        },
        tx,
      );

      return updated;
    });
  }

  static async revokeInvitation(invitationId: string, actorId: string) {
    const invitation = await db.orgInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new Error("Ftesa nuk mund të anulohet.");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.orgInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
      });

      await AuditService.log(
        {
          actorId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "org_invitation",
          entityId: invitationId,
          afterState: { status: InvitationStatus.REVOKED },
        },
        tx,
      );

      return updated;
    });
  }

  static async expireStaleInvitations() {
    const result = await db.orgInvitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });

    return result.count;
  }
}
