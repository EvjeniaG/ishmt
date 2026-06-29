import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { validateUserOrgMembership } from "@/lib/auth/validate-membership";
import { AuditService } from "@/lib/audit/audit-service";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import type { PermissionCode } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: 401 | 403 = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  activeOrgId: string;
  activeOrgType: string;
  activeOrgName: string;
  roleCode: RoleCode;
  permissions: PermissionCode[];
};

export async function requireAuth(): Promise<AuthContext> {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.roleCode || !session.user.activeOrgId) {
    throw new AuthError("Kërkohet autentifikim.", 401);
  }

  const validated = await validateUserOrgMembership(session.user.id, session.user.activeOrgId);

  if (!validated) {
    throw new AuthError("Organizata aktive nuk i përket këtij përdoruesi.", 401);
  }

  return {
    userId: validated.userId,
    email: validated.email,
    firstName: validated.firstName,
    lastName: validated.lastName,
    activeOrgId: validated.activeOrgId,
    activeOrgType: validated.activeOrgType,
    activeOrgName: validated.activeOrgName,
    roleCode: validated.roleCode,
    permissions: validated.permissions,
  };
}

export async function requirePermission(permission: PermissionCode): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (!ctx.permissions.includes(permission)) {
    const hdrs = await headers();

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.PERMISSION_DENIED,
      entityType: "permission",
      entityId: ctx.userId,
      metadata: { permission, roleCode: ctx.roleCode },
      ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
      userAgent: hdrs.get("user-agent"),
    });

    throw new AuthError("Nuk keni leje për këtë veprim.", 403);
  }

  return ctx;
}

export async function requireRole(...roles: RoleCode[]): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (!roles.includes(ctx.roleCode)) {
    throw new AuthError("Roli juaj nuk lejohet për këtë veprim.", 403);
  }

  return ctx;
}

export function hasPermission(ctx: AuthContext, permission: PermissionCode): boolean {
  return roleHasPermission(ctx.roleCode, permission) && ctx.permissions.includes(permission);
}

export async function getTokenFromRequest(req: NextRequest) {
  return getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
}

export function isIshmtRole(roleCode: RoleCode): boolean {
  return isIshmtStaffRole(roleCode);
}
