import { ApplicationStatus, Prisma, ReturnTargetRole } from "@prisma/client";

export const RETURN_TARGET_LABELS: Record<ReturnTargetRole, string> = {
  OWNER: "Personi përgjegjës i ashensorit",
  INSTALLER: "Kompania instaluese",
  CERTIFIER: "Kompania certifikuese (OMI)",
};

const RETURN_TARGET_ORDER: ReturnTargetRole[] = [
  ReturnTargetRole.OWNER,
  ReturnTargetRole.INSTALLER,
  ReturnTargetRole.CERTIFIER,
];

export function parseReturnToRoles(raw: unknown): ReturnTargetRole[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(Object.values(ReturnTargetRole));
  return raw.filter((v): v is ReturnTargetRole => typeof v === "string" && allowed.has(v as ReturnTargetRole));
}

export function getReturnToRoles(app: {
  returnToRole?: ReturnTargetRole | null;
  returnToRoles?: unknown;
}): ReturnTargetRole[] {
  const fromJson = parseReturnToRoles(app.returnToRoles);
  if (fromJson.length > 0) return fromJson;
  return app.returnToRole ? [app.returnToRole] : [];
}

export function isReturnedToRole(
  app: { returnToRole?: ReturnTargetRole | null; returnToRoles?: unknown },
  role: ReturnTargetRole,
): boolean {
  return getReturnToRoles(app).includes(role);
}

/** Roli kryesor i kthimit (prioritet: personi përgjegjës i ashensorit → instaluesi → certifikuesi). */
export function pickPrimaryReturnToRole(roles: ReturnTargetRole[]): ReturnTargetRole {
  for (const role of RETURN_TARGET_ORDER) {
    if (roles.includes(role)) return role;
  }
  return roles[0];
}

export function removeCompletedReturnRole(
  roles: ReturnTargetRole[],
  completed: ReturnTargetRole,
): ReturnTargetRole[] {
  return roles.filter((role) => role !== completed);
}

/** Statusi pas përfundimit të korrigimit nga një palë. */
export function resolveStatusAfterReturnCorrection(remainingRoles: ReturnTargetRole[]): ApplicationStatus {
  return remainingRoles.length > 0
    ? ApplicationStatus.RETURNED
    : ApplicationStatus.PENDING_OWNER_SUBMISSION;
}

/** Kusht Prisma: aplikimi i kthyer që përfshin rolin e dhënë (edhe kur ka shumë palë). */
export function applicationReturnedToRoleWhere(role: ReturnTargetRole): Prisma.ApplicationWhereInput {
  return {
    status: ApplicationStatus.RETURNED,
    OR: [{ returnToRole: role }, { returnToRoles: { array_contains: role } }],
  };
}
