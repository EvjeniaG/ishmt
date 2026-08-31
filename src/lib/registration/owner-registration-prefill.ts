import { db } from "@/lib/db";
import type { OwnerBuildingRole } from "@prisma/client";
import {
  ownerBuildingRoleToResponsibleEntityType,
  ownerRequiresNipt,
} from "@/lib/registration/owner-entity-role";
import {
  loadRegistrationWorkflowPrefill,
  registrationWorkflowPrefillToExtendedData,
} from "@/lib/registration/registration-workflow-prefill";

/** Të dhëna nga profili për ndërrim lloji subjekti në formular. */
export type OwnerProfileSnapshot = {
  contactFullName: string;
  contactNid?: string;
  contactEmail?: string;
  contactPhone?: string;
  subjectName?: string;
  subjectNipt?: string;
};

export type OwnerRegistrationPrefill = {
  applicationDate?: string;
  buildingAddress?: string;
  municipalityId?: string;
  responsibleEntityName?: string;
  responsibleEntityIdentifier?: string;
  responsibleEntityEmail?: string;
  responsibleEntityPhone?: string;
  profileSnapshot?: OwnerProfileSnapshot;
  registrationExtendedData?: Record<string, string>;
};

type OwnerPrefillSource = {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    nid: string | null;
    fatherName: string | null;
  };
  org: {
    name: string;
    nipt: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    municipalityId: string | null;
    ownerBuildingRole: OwnerBuildingRole | null;
    representativeName: string | null;
  };
};

function identifierTypeForRole(role: OwnerBuildingRole | null, nipt: string | null) {
  if (role === "ADMINISTRATOR" || !ownerRequiresNipt(role ?? undefined)) {
    return "NID" as const;
  }
  return nipt ? ("NIPT" as const) : ("NID" as const);
}

export function buildOwnerProfileSnapshot(source: OwnerPrefillSource): OwnerProfileSnapshot {
  const fullName = `${source.user.firstName} ${source.user.lastName}`.trim();
  return {
    contactFullName: source.org.representativeName?.trim() || fullName,
    contactNid: source.user.nid?.trim().toUpperCase() || undefined,
    contactEmail: source.user.email || source.org.email || undefined,
    contactPhone: source.user.phone || source.org.phone || undefined,
    subjectName: source.org.name?.trim() || undefined,
    subjectNipt: source.org.nipt?.trim().toUpperCase() || undefined,
  };
}

export function buildOwnerRegistrationPrefill(source: OwnerPrefillSource): OwnerRegistrationPrefill {
  const snapshot = buildOwnerProfileSnapshot(source);
  const fullName = snapshot.contactFullName;
  const nipt = snapshot.subjectNipt ?? null;
  const role = source.org.ownerBuildingRole;
  const responsibleEntityType = ownerBuildingRoleToResponsibleEntityType(role) ?? "ADMINISTRATOR";
  const identifierType = identifierTypeForRole(role, nipt);
  const usesNipt = ownerRequiresNipt(role ?? undefined) && nipt;
  const isAdministrator = role === "ADMINISTRATOR";
  const orgAddress = source.org.address?.trim() || undefined;

  return {
    applicationDate: new Date().toISOString().slice(0, 10),
    buildingAddress: orgAddress,
    municipalityId: source.org.municipalityId ?? undefined,
    profileSnapshot: snapshot,
    responsibleEntityName: isAdministrator
      ? fullName
      : snapshot.subjectName || fullName,
    responsibleEntityIdentifier: usesNipt
      ? nipt
      : snapshot.contactNid,
    responsibleEntityEmail: snapshot.contactEmail,
    responsibleEntityPhone: snapshot.contactPhone,
    registrationExtendedData: {
      responsibleEntityType,
      responsibleIdentifierType: identifierType,
      ...(!isAdministrator
        ? { representedBy: fullName }
        : {}),
      ...(orgAddress ? { responsibleAddress: orgAddress } : {}),
    },
  };
}

export async function loadOwnerRegistrationPrefill(
  userId: string,
  orgId: string,
  options?: { excludeApplicationId?: string },
): Promise<OwnerRegistrationPrefill | null> {
  const [user, org, workflow] = await Promise.all([
    db.authUser.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        nid: true,
        fatherName: true,
      },
    }),
    db.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        nipt: true,
        email: true,
        phone: true,
        address: true,
        municipalityId: true,
        ownerBuildingRole: true,
        representativeName: true,
      },
    }),
    loadRegistrationWorkflowPrefill(orgId, options),
  ]);

  if (!user || !org) return null;

  const base = buildOwnerRegistrationPrefill({ user, org });
  base.registrationExtendedData = {
    ...base.registrationExtendedData,
    ...registrationWorkflowPrefillToExtendedData(workflow),
  };
  return base;
}

function mergeExtendedData(
  saved: Record<string, unknown> | null | undefined,
  prefill: Record<string, string> | undefined,
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = { ...(prefill ?? {}) };
  for (const [key, value] of Object.entries(saved ?? {})) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      merged[key] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function mergeApplicationDataWithOwnerPrefill<
  T extends {
    applicationDate?: Date | string | null;
    buildingAddress?: string | null;
    municipalityId?: string | null;
    responsibleEntityName?: string | null;
    responsibleEntityIdentifier?: string | null;
    responsibleEntityEmail?: string | null;
    responsibleEntityPhone?: string | null;
    registrationExtendedData?: unknown;
  },
>(data: T | null | undefined, prefill: OwnerRegistrationPrefill | null | undefined): T {
  const base = { ...(data ?? {}) } as T;
  if (!prefill) return base;

  if (!base.applicationDate && prefill.applicationDate) {
    base.applicationDate = prefill.applicationDate;
  }
  if (!base.buildingAddress?.trim() && prefill.buildingAddress) {
    base.buildingAddress = prefill.buildingAddress;
  }
  if (!base.municipalityId && prefill.municipalityId) {
    base.municipalityId = prefill.municipalityId;
  }
  if (!base.responsibleEntityName?.trim() && prefill.responsibleEntityName) {
    base.responsibleEntityName = prefill.responsibleEntityName;
  }
  if (!base.responsibleEntityIdentifier?.trim() && prefill.responsibleEntityIdentifier) {
    base.responsibleEntityIdentifier = prefill.responsibleEntityIdentifier;
  }
  if (!base.responsibleEntityEmail?.trim() && prefill.responsibleEntityEmail) {
    base.responsibleEntityEmail = prefill.responsibleEntityEmail;
  }
  if (!base.responsibleEntityPhone?.trim() && prefill.responsibleEntityPhone) {
    base.responsibleEntityPhone = prefill.responsibleEntityPhone;
  }

  base.registrationExtendedData = mergeExtendedData(
    (base.registrationExtendedData as Record<string, unknown> | null | undefined) ?? undefined,
    prefill.registrationExtendedData,
  ) as T["registrationExtendedData"];

  return base;
}

/** Vlera të sugjeruara për forma ndryshimi/përditësimi - nga profili i personit përgjegjës. */
export function buildOwnerFieldSuggestions(
  prefill: OwnerRegistrationPrefill | null | undefined,
): Record<string, string | undefined> {
  if (!prefill) return {};
  return {
    responsibleEntityName: prefill.responsibleEntityName,
    responsibleEntityIdentifier: prefill.responsibleEntityIdentifier,
    responsibleEntityPhone: prefill.responsibleEntityPhone,
    responsibleEntityEmail: prefill.responsibleEntityEmail,
    buildingAddress: prefill.buildingAddress,
  };
}
