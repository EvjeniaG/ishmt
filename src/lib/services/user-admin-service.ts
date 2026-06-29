import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import { AuditAction } from "@prisma/client";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { hashPassword, validatePassword } from "@/lib/auth/password";

function generateTemporaryPassword(): string {
  const suffix = randomBytes(4).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
  return `Ishmt${suffix}1A`;
}

export class UserAdminService {
  static assertAdmin(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.ADMIN) {
      throw new Error("Vetëm administratori mund të menaxhojë përdoruesit.");
    }
  }

  static async listUsers(filters: {
    query?: string;
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 25, 100);
    const q = filters.query?.trim();

    const where: Prisma.AuthUserWhereInput = {
      deletedAt: null,
      ...(filters.activeOnly !== false ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { nid: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.authUser.findMany({
        where,
        include: {
          memberships: {
            where: { deactivatedAt: null },
            include: {
              organization: { select: { id: true, name: true, type: true } },
              role: { select: { code: true, name: true } },
            },
          },
        },
        orderBy: { lastName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.authUser.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  static async getUser(userId: string) {
    return db.authUser.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });
  }

  static async setActive(ctx: AuthContext, userId: string, isActive: boolean) {
    this.assertAdmin(ctx);

    const user = await db.authUser.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new Error("Përdoruesi nuk u gjet.");

    const updated = await db.authUser.update({
      where: { id: userId },
      data: { isActive },
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.UPDATE,
      entityType: "auth_user",
      entityId: userId,
      beforeState: { isActive: user.isActive },
      afterState: { isActive },
    });

    return updated;
  }

  static async unlockAccount(ctx: AuthContext, userId: string) {
    this.assertAdmin(ctx);

    const updated = await db.authUser.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.UPDATE,
      entityType: "auth_user",
      entityId: userId,
      afterState: { action: "UNLOCK" },
    });

    return updated;
  }

  /** Admin sets a new temporary password when the user forgot theirs. */
  static async resetPassword(ctx: AuthContext, userId: string, newPassword?: string) {
    this.assertAdmin(ctx);

    const user = await db.authUser.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new Error("Përdoruesi nuk u gjet.");
    if (userId === ctx.userId) {
      throw new Error("Përdorni profilin tuaj për të ndryshuar fjalëkalimin tuaj.");
    }

    const password = newPassword?.trim() || generateTemporaryPassword();
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(" "));
    }

    const passwordHash = await hashPassword(password);

    await db.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.authUser.update({
        where: { id: userId },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.UPDATE,
      entityType: "auth_user",
      entityId: userId,
      afterState: { action: "ADMIN_PASSWORD_RESET" },
      metadata: { targetEmail: user.email },
    });

    return { email: user.email, temporaryPassword: password };
  }

  /** Admin generates a one-time reset link for the user (valid 1 hour). */
  static async createPasswordResetLink(ctx: AuthContext, userId: string) {
    this.assertAdmin(ctx);

    const user = await db.authUser.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) throw new Error("Përdoruesi nuk u gjet ose nuk është aktiv.");
    if (userId === ctx.userId) {
      throw new Error("Përdorni profilin tuaj për të ndryshuar fjalëkalimin tuaj.");
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
    await db.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.UPDATE,
      entityType: "auth_user",
      entityId: userId,
      afterState: { action: "ADMIN_PASSWORD_RESET_LINK" },
      metadata: { targetEmail: user.email, expiresAt: expiresAt.toISOString() },
    });

    return { email: user.email, resetUrl, expiresAt };
  }

  static async listRoles() {
    return db.authRole.findMany({ orderBy: { code: "asc" } });
  }
}
