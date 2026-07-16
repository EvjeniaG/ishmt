import { OrgStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { QkbLookupService, type QkbStatus } from "@/lib/services/qkb-lookup-service";

type OrganizationLike = {
  id: string;
  type: OrgType;
  name: string;
  nipt: string | null;
  status: OrgStatus;
  qkbValidated?: boolean;
  deletedAt?: Date | null;
};

export type CapabilityCheck = {
  ok: boolean;
  reason?: string;
};

export type MaintenanceCapabilityCheck = CapabilityCheck & {
  qkbStatus: QkbStatus;
  qkbStatusLabel: string;
};

export class OrganizationCapabilityService {
  static evaluateMaintenanceCapability(
    org: OrganizationLike,
    lookup: { qkbStatus: QkbStatus; statusLabel: string },
    options?: { allowCertifier?: boolean },
  ): MaintenanceCapabilityCheck {
    const typeAllowed =
      org.type === OrgType.MAINTENANCE ||
      (options?.allowCertifier === true && org.type === OrgType.CERTIFIER);

    if (!typeAllowed) {
      return {
        ok: false,
        qkbStatus: lookup.qkbStatus,
        qkbStatusLabel: lookup.statusLabel,
        reason: "Subjekti nuk ka rol per mirembajtje.",
      };
    }
    if (!org.nipt) {
      return {
        ok: false,
        qkbStatus: "UNKNOWN",
        qkbStatusLabel: "NIPT i paparashtruar",
        reason: "Subjekti nuk ka NIPT.",
      };
    }
    if (org.deletedAt) {
      return {
        ok: false,
        qkbStatus: lookup.qkbStatus,
        qkbStatusLabel: lookup.statusLabel,
        reason: "Subjekti eshte i fshire.",
      };
    }
    if (lookup.qkbStatus !== "ACTIVE") {
      return {
        ok: false,
        qkbStatus: lookup.qkbStatus,
        qkbStatusLabel: lookup.statusLabel,
        reason: "Subjekti nuk rezulton aktiv ne QKB.",
      };
    }

    return {
      ok: true,
      qkbStatus: lookup.qkbStatus,
      qkbStatusLabel: lookup.statusLabel,
    };
  }

  static evaluatePeriodicInspectionCapability(org: OrganizationLike & { hasActiveLicense: boolean }): CapabilityCheck {
    if (org.type !== OrgType.CERTIFIER) {
      return { ok: false, reason: "Subjekti nuk eshte OMI/certifikues." };
    }
    if (org.deletedAt) {
      return { ok: false, reason: "Subjekti eshte i fshire." };
    }
    if (org.status !== OrgStatus.ACTIVE) {
      return { ok: false, reason: "Subjekti nuk eshte aktiv ne regjister." };
    }
    if (!org.hasActiveLicense) {
      return { ok: false, reason: "Subjekti nuk ka licence aktive OMI." };
    }
    return { ok: true };
  }

  static async assertMaintenanceProvider(orgId: string, options?: { allowCertifier?: boolean }) {
    const org = await db.organization.findFirst({
      where: {
        id: orgId,
        type: options?.allowCertifier ? { in: [OrgType.MAINTENANCE, OrgType.CERTIFIER] } : OrgType.MAINTENANCE,
        deletedAt: null,
      },
    });
    if (!org?.nipt) throw new Error("Kompania e mirembajtjes nuk u gjet.");

    const lookup = await QkbLookupService.lookup(org.nipt, org.name);
    const capability = this.evaluateMaintenanceCapability(org, lookup, options);
    if (!capability.ok) {
      throw new Error(
        lookup.qkbStatus === "INACTIVE" || lookup.qkbStatus === "SUSPENDED"
          ? "Kjo kompani nuk rezulton aktive ne QKB dhe nuk mund te caktohet si kompani mirembajtese."
          : `${org.name}: ${capability.reason ?? capability.qkbStatusLabel}`,
      );
    }
    return org;
  }

  static async listPeriodicInspectionProviders() {
    const now = new Date();
    const orgs = await db.organization.findMany({
      where: {
        type: OrgType.CERTIFIER,
        status: OrgStatus.ACTIVE,
        deletedAt: null,
        licenses: { some: { status: "ACTIVE", expiryDate: { gte: now } } },
      },
      select: { id: true, name: true, nipt: true },
      orderBy: { name: "asc" },
    });

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      nipt: org.nipt,
      selectable: true,
    }));
  }

  static async assertPeriodicInspectionProvider(orgId: string) {
    const now = new Date();
    const org = await db.organization.findFirst({
      where: {
        id: orgId,
        type: OrgType.CERTIFIER,
        status: OrgStatus.ACTIVE,
        deletedAt: null,
        licenses: { some: { status: "ACTIVE", expiryDate: { gte: now } } },
      },
    });
    if (!org) {
      throw new Error("Organizata certifikuese/OMI nuk u gjet ose nuk ka licence aktive.");
    }
    return org;
  }
}
