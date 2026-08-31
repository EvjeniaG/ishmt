import { db } from "@/lib/db";
import { activeInstallerOrgWhere } from "@/lib/organizations/licensed-org-filters";
import { QkbLookupService, type QkbStatus } from "@/lib/services/qkb-lookup-service";

export type InstallerCompanyOption = {
  id: string;
  name: string;
  nipt: string | null;
  qkbStatus: QkbStatus;
  qkbStatusLabel: string;
  selectable: boolean;
};

export class InstallerAssignmentService {
  private static activeInstallerWhere(excludeOrgId?: string | null) {
    const base = activeInstallerOrgWhere();
    if (!excludeOrgId) return base;
    return { ...base, NOT: { id: excludeOrgId } };
  }

  private static async toOption(org: {
    id: string;
    name: string;
    nipt: string | null;
    status: import("@prisma/client").OrgStatus;
  }): Promise<InstallerCompanyOption> {
    const lookup = org.nipt ? await QkbLookupService.lookup(org.nipt, org.name) : null;
    const qkbStatus = lookup?.qkbStatus ?? "UNKNOWN";
    const selectable =
      org.nipt !== null &&
      qkbStatus === "ACTIVE" &&
      (org.status === "ACTIVE" || org.status === "ACTIVE_AUTHORIZED");

    return {
      id: org.id,
      name: org.name,
      nipt: org.nipt,
      qkbStatus,
      qkbStatusLabel: lookup ? lookup.statusLabel : "NIPT i paparashtruar",
      selectable,
    };
  }

  static async lookupCompanyByNipt(
    nipt: string,
    options?: { excludeOrgId?: string | null },
  ): Promise<InstallerCompanyOption | null> {
    const org = await db.organization.findFirst({
      where: { ...this.activeInstallerWhere(options?.excludeOrgId), nipt: nipt.trim().toUpperCase() },
      select: { id: true, name: true, nipt: true, status: true },
    });
    if (!org) return null;
    return this.toOption(org);
  }

  static async findInstallerCompaniesByName(
    query: string,
    options?: { excludeOrgId?: string | null },
  ): Promise<InstallerCompanyOption[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    const queryUpper = normalized.toUpperCase();

    const orgs = await db.organization.findMany({
      where: {
        ...this.activeInstallerWhere(options?.excludeOrgId),
        OR: [
          { name: { contains: normalized, mode: "insensitive" } },
          { nipt: queryUpper },
        ],
      },
      select: { id: true, name: true, nipt: true, status: true },
      orderBy: { name: "asc" },
      take: 8,
    });

    return Promise.all(orgs.map((org) => this.toOption(org)));
  }
}
