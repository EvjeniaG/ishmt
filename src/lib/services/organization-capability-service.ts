import { OrgStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { QkbLookupService, type QkbStatus } from "@/lib/services/qkb-lookup-service";
import { activeCertifierOrgWhere, activeInstallerOrgWhere } from "@/lib/organizations/licensed-org-filters";
import { capabilitiesFromOrg } from "@/lib/organizations/org-capabilities";

type OrganizationLike = {
  id: string;
  type: OrgType;
  name: string;
  nipt: string | null;
  status: OrgStatus;
  qkbValidated?: boolean;
  deletedAt?: Date | null;
  capInstall?: boolean | null;
  capMaintenance?: boolean | null;
  capOm?: boolean | null;
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
    const caps = capabilitiesFromOrg(org);
    const typeAllowed =
      caps.capMaintenance || (options?.allowCertifier === true && caps.capOm);

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
    const caps = capabilitiesFromOrg(org);
    if (!caps.capOm) {
      return { ok: false, reason: "Subjekti nuk eshte OM/certifikues." };
    }
    if (org.deletedAt) {
      return { ok: false, reason: "Subjekti eshte i fshire." };
    }
    if (org.status !== OrgStatus.ACTIVE) {
      return { ok: false, reason: "Subjekti nuk eshte aktiv ne regjister." };
    }
    if (!org.hasActiveLicense) {
      return { ok: false, reason: "Subjekti nuk ka licence aktive OM." };
    }
    return { ok: true };
  }

  static evaluateInstallerCapability(
    org: OrganizationLike,
    lookup: { qkbStatus: QkbStatus; statusLabel: string },
  ): MaintenanceCapabilityCheck {
    const caps = capabilitiesFromOrg(org);
    if (!caps.capInstall) {
      return {
        ok: false,
        qkbStatus: lookup.qkbStatus,
        qkbStatusLabel: lookup.statusLabel,
        reason: "Subjekti nuk ka rol instaluesi.",
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

  static async assertInstallerProvider(orgId: string) {
    const org = await db.organization.findFirst({
      where: { ...activeInstallerOrgWhere(), id: orgId },
    });
    if (!org?.nipt) throw new Error("Kompania instaluese nuk u gjet ose nuk ka licencë aktive instalimi.");

    const lookup = await QkbLookupService.lookup(org.nipt, org.name);
    const capability = this.evaluateInstallerCapability(org, lookup);
    if (!capability.ok) {
      throw new Error(
        lookup.qkbStatus === "INACTIVE" || lookup.qkbStatus === "SUSPENDED"
          ? "Kjo kompani nuk rezulton aktive ne QKB dhe nuk mund te caktohet si instaluese."
          : `${org.name}: ${capability.reason ?? capability.qkbStatusLabel}`,
      );
    }
    return org;
  }

  static async assertMaintenanceProvider(orgId: string, options?: { allowCertifier?: boolean }) {
    const org = await db.organization.findFirst({
      where: {
        id: orgId,
        deletedAt: null,
        OR: options?.allowCertifier
          ? [{ type: OrgType.MAINTENANCE }, { capMaintenance: true }, { type: OrgType.CERTIFIER }, { capOm: true }]
          : [{ type: OrgType.MAINTENANCE }, { capMaintenance: true }],
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
    const orgs = await db.organization.findMany({
      where: activeCertifierOrgWhere(),
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
    const org = await db.organization.findFirst({
      where: { ...activeCertifierOrgWhere(), id: orgId },
    });
    if (!org) {
      throw new Error("Organizata certifikuese/OM nuk u gjet ose nuk ka licencë aktive OM.");
    }
    return org;
  }
}
