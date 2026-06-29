import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuditAction } from "@prisma/client";
import type { PermissionCode } from "@/lib/permissions/codes";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { buildSessionContext } from "@/lib/auth/session-context";
import { AccountSecurityService } from "@/lib/services/account-security-service";
import { AuditService } from "@/lib/audit/audit-service";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";

const LOCKOUT_MAX = 5;
const LOCKOUT_MINUTES = 30;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 2 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "NID / NIPT", type: "text" },
        password: { label: "Password", type: "password" },
        level: { label: "Level", type: "text" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        // Per-IP login throttling to slow credential stuffing / brute force.
        const ip = await getClientIp();
        if (!rateLimit(`login:${ip}`, RATE_LIMITS.LOGIN_PER_MINUTE, 60_000).allowed) {
          throw new Error("Shumë përpjekje hyrjeje. Provoni sërish më vonë.");
        }

        const identifier = credentials.identifier.trim();
        const level = credentials.level?.trim() || null;
        const now = new Date();

        // Resolve candidate users from NID (person), NIPT (organization) or email (recovery).
        const candidates = new Map<string, Awaited<ReturnType<typeof db.authUser.findFirst>>>();
        const addCandidate = (
          user: Awaited<ReturnType<typeof db.authUser.findFirst>>,
        ) => {
          if (user) candidates.set(user.id, user);
        };

        addCandidate(
          await db.authUser.findFirst({
            where: { nid: identifier.toUpperCase(), deletedAt: null },
          }),
        );
        addCandidate(
          await db.authUser.findFirst({
            where: { email: identifier.toLowerCase(), deletedAt: null },
          }),
        );

        const org = await db.organization.findFirst({
          where: { nipt: identifier.toUpperCase(), deletedAt: null },
        });
        if (org) {
          const memberships = await db.orgMembership.findMany({
            where: { organizationId: org.id, deactivatedAt: null },
            include: { user: true },
          });
          for (const membership of memberships) {
            if (membership.user.deletedAt === null) addCandidate(membership.user);
          }
        }

        const usable = [...candidates.values()].filter(
          (user): user is NonNullable<typeof user> =>
            Boolean(user?.passwordHash) && Boolean(user?.isActive),
        );

        if (usable.length === 0) {
          return null;
        }

        // Match the supplied password against the candidate set.
        let matched: (typeof usable)[number] | null = null;
        for (const candidate of usable) {
          if (candidate.lockedUntil && candidate.lockedUntil > now) {
            if (usable.length === 1) throw new Error("ACCOUNT_LOCKED");
            continue;
          }
          if (await verifyPassword(credentials.password, candidate.passwordHash!)) {
            matched = candidate;
            break;
          }
        }

        if (!matched) {
          if (usable.length === 1) {
            const only = usable[0];
            const failedCount = only.failedLoginCount + 1;
            const lockedUntil =
              failedCount >= LOCKOUT_MAX
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                : null;
            await db.authUser.update({
              where: { id: only.id },
              data: { failedLoginCount: failedCount, lockedUntil },
            });
          }
          return null;
        }

        // The selected access level must match one of the user's active memberships.
        const memberships = await db.orgMembership.findMany({
          where: { userId: matched.id, deactivatedAt: null },
          include: { role: true },
        });
        if (memberships.length === 0) {
          return null;
        }

        let selected = level
          ? memberships.find((m) => m.role.code === level)
          : memberships.find((m) => m.isPrimary) ?? memberships[0];

        if (level && !selected) {
          throw new Error("LEVEL_MISMATCH");
        }
        selected = selected ?? memberships.find((m) => m.isPrimary) ?? memberships[0];

        if (matched.twoFactorEnabled) {
          const totpCode = credentials.totpCode?.trim();
          if (!totpCode) {
            throw new Error("2FA_REQUIRED");
          }
          const validTotp = await AccountSecurityService.verifyLoginTotp(matched.id, totpCode);
          if (!validTotp) {
            throw new Error("2FA_INVALID");
          }
        }

        await db.authUser.update({
          where: { id: matched.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        const context = await buildSessionContext(matched.id, selected.organizationId);

        if (!context) {
          return null;
        }

        return {
          id: matched.id,
          email: matched.email,
          name: `${matched.firstName} ${matched.lastName}`,
          firstName: matched.firstName,
          lastName: matched.lastName,
          activeOrgId: context.activeOrgId,
          activeOrgType: context.activeOrgType,
          activeOrgName: context.activeOrgName,
          roleCode: context.roleCode,
          permissions: context.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.firstName = (user as { firstName?: string }).firstName ?? "";
        token.lastName = (user as { lastName?: string }).lastName ?? "";
        token.activeOrgId = (user as { activeOrgId?: string }).activeOrgId ?? "";
        token.activeOrgType = (user as { activeOrgType?: string }).activeOrgType as never;
        token.activeOrgName = (user as { activeOrgName?: string }).activeOrgName ?? "";
        token.roleCode = (user as { roleCode?: string }).roleCode as never;
        token.permissions = (user as { permissions?: PermissionCode[] }).permissions ?? [];
      }

      if (trigger === "update" && session?.activeOrgId && token.userId) {
        const context = await buildSessionContext(token.userId, session.activeOrgId as string);

        if (context) {
          token.activeOrgId = context.activeOrgId;
          token.activeOrgType = context.activeOrgType;
          token.activeOrgName = context.activeOrgName;
          token.roleCode = context.roleCode;
          token.permissions = context.permissions;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user = {
          ...session.user,
          id: token.userId,
          email: token.email ?? "",
          firstName: token.firstName,
          lastName: token.lastName,
          activeOrgId: token.activeOrgId,
          activeOrgType: token.activeOrgType,
          activeOrgName: token.activeOrgName,
          roleCode: token.roleCode,
          permissions: token.permissions,
        };
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await AuditService.log({
          actorId: user.id,
          action: AuditAction.LOGIN,
          entityType: "auth_user",
          entityId: user.id,
        });
      }
    },
    async signOut({ token }) {
      if (token?.userId) {
        await AuditService.log({
          actorId: token.userId as string,
          action: AuditAction.LOGOUT,
          entityType: "auth_user",
          entityId: token.userId as string,
        });
      }
    },
  },
};
