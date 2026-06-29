import { createHash, randomBytes } from "crypto";
import { AuditAction } from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import { buildTotpAuthUrl, generateTotpSecret, verifyTotpCode } from "@/lib/auth/totp";
import { db } from "@/lib/db";

function logDevVerification(label: string, email: string, token: string, path: string) {
  if (process.env.NODE_ENV === "production") return;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log(`\n=== ${label} (dev only) ===`);
  console.log(`Email: ${email}`);
  console.log(`Token: ${token}`);
  console.log(`URL: ${baseUrl}${path}`);
  console.log("========================\n");
}

export class AccountSecurityService {
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(" "));
    }

    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new Error("Përdoruesi nuk u gjet.");

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("Fjalëkalimi aktual është i gabuar.");
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw new Error("Fjalëkalimi i ri duhet të jetë i ndryshëm nga ai aktual.");
    }

    const passwordHash = await hashPassword(newPassword);

    await db.$transaction(async (tx) => {
      await tx.authUser.update({
        where: { id: userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });

      await AuditService.log(
        {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityType: "auth_user",
          entityId: userId,
          metadata: { field: "password", action: "password_changed" },
        },
        tx,
      );
    });
  }

  static async requestEmailChange(userId: string, newEmail: string, currentPassword: string) {
    const normalizedEmail = newEmail.toLowerCase().trim();
    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new Error("Përdoruesi nuk u gjet.");

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("Fjalëkalimi aktual është i gabuar.");
    }

    if (normalizedEmail === user.email.toLowerCase()) {
      throw new Error("Email i ri duhet të jetë i ndryshëm nga ai aktual.");
    }

    const existing = await db.authUser.findFirst({
      where: { email: normalizedEmail, deletedAt: null, NOT: { id: userId } },
    });
    if (existing) throw new Error("Ky email përdoret nga një llogari tjetër.");

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const identifier = `email-change:${userId}`;

    await db.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({ where: { identifier } });
      await tx.verificationToken.create({
        data: { identifier, token: tokenHash, expires },
      });
      await tx.authUser.update({
        where: { id: userId },
        data: { pendingEmail: normalizedEmail },
      });

      await AuditService.log(
        {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityType: "auth_user",
          entityId: userId,
          metadata: { field: "email", action: "email_change_requested", pendingEmail: normalizedEmail },
        },
        tx,
      );
    });

    logDevVerification(
      "EMAIL CHANGE VERIFICATION",
      normalizedEmail,
      rawToken,
      `/auth/verify-email?token=${rawToken}`,
    );

    return { pendingEmail: normalizedEmail };
  }

  static async confirmEmailChange(rawToken: string) {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await db.verificationToken.findFirst({
      where: { token: tokenHash, expires: { gt: new Date() } },
    });

    if (!record?.identifier.startsWith("email-change:")) {
      throw new Error("Linku i verifikimit është i pavlefshëm ose i skaduar.");
    }

    const userId = record.identifier.replace("email-change:", "");
    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.pendingEmail) throw new Error("Nuk ka kërkesë aktive për ndryshim email-i.");

    const newEmail = user.pendingEmail;

    await db.$transaction(async (tx) => {
      await tx.authUser.update({
        where: { id: userId },
        data: {
          email: newEmail,
          pendingEmail: { set: null },
          emailVerified: true,
        },
      });
      await tx.verificationToken.deleteMany({ where: { identifier: record.identifier } });

      await AuditService.log(
        {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityType: "auth_user",
          entityId: userId,
          beforeState: { email: user.email },
          afterState: { email: newEmail },
        },
        tx,
      );
    });

    return { email: newEmail };
  }

  static async beginTwoFactorSetup(userId: string, currentPassword: string) {
    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new Error("Përdoruesi nuk u gjet.");
    if (user.twoFactorEnabled) throw new Error("Verifikimi dyfaktorësh është tashmë aktiv.");

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("Fjalëkalimi aktual është i gabuar.");
    }

    const secret = generateTotpSecret();
    await db.authUser.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    return {
      secret,
      otpauthUrl: buildTotpAuthUrl(user.email, secret),
    };
  }

  static async enableTwoFactor(userId: string, currentPassword: string, code: string) {
    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !user.twoFactorSecret) {
      throw new Error("Konfigurimi i 2FA nuk është filluar.");
    }
    if (user.twoFactorEnabled) throw new Error("Verifikimi dyfaktorësh është tashmë aktiv.");

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("Fjalëkalimi aktual është i gabuar.");
    }
    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      throw new Error("Kodi i verifikimit është i gabuar.");
    }

    await db.$transaction(async (tx) => {
      await tx.authUser.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });
      await AuditService.log(
        {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityType: "auth_user",
          entityId: userId,
          metadata: { field: "two_factor", action: "enabled" },
        },
        tx,
      );
    });
  }

  static async disableTwoFactor(userId: string, currentPassword: string, code: string) {
    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !user.twoFactorSecret || !user.twoFactorEnabled) {
      throw new Error("Verifikimi dyfaktorësh nuk është aktiv.");
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("Fjalëkalimi aktual është i gabuar.");
    }
    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      throw new Error("Kodi i verifikimit është i gabuar.");
    }

    await db.$transaction(async (tx) => {
      await tx.authUser.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
      await AuditService.log(
        {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityType: "auth_user",
          entityId: userId,
          metadata: { field: "two_factor", action: "disabled" },
        },
        tx,
      );
    });
  }

  static async verifyLoginTotp(userId: string, code: string): Promise<boolean> {
    const user = await db.authUser.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return true;
    return verifyTotpCode(user.twoFactorSecret, code);
  }
}
