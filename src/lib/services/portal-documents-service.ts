import { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { DocumentService } from "@/lib/services/document-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";

export class PortalDocumentsService {
  static async listForOrg(ctx: AuthContext) {
    const orgId = ctx.activeOrgId;
    let applicationIds: string[] = [];
    let elevatorIds: string[] = [];

    if (ctx.roleCode === ROLE_CODES.OWNER) {
      const elevators = await db.elevator.findMany({
        where: { ownerOrgId: orgId, deletedAt: null },
        select: { id: true },
      });
      const applications = await db.application.findMany({
        where: { ownerOrgId: orgId, deletedAt: null },
        select: { id: true },
      });
      elevatorIds = elevators.map((e) => e.id);
      applicationIds = applications.map((a) => a.id);
    } else if (ctx.roleCode === ROLE_CODES.INSTALLER) {
      const apps = await db.application.findMany({
        where: {
          deletedAt: null,
          OR: [{ installerOrgId: orgId }, { delegations: { some: { organizationId: orgId } } }],
        },
        select: { id: true },
      });
      applicationIds = apps.map((a) => a.id);
    } else if (ctx.roleCode === ROLE_CODES.CERTIFIER) {
      const apps = await db.application.findMany({
        where: {
          deletedAt: null,
          OR: [{ certifierOrgId: orgId }, { delegations: { some: { organizationId: orgId } } }],
        },
        select: { id: true },
      });
      applicationIds = apps.map((a) => a.id);
    } else if (ctx.roleCode === ROLE_CODES.MAINTENANCE) {
      const elevators = await db.elevator.findMany({
        where: { maintenanceOrgId: orgId, deletedAt: null },
        select: { id: true },
      });
      elevatorIds = elevators.map((e) => e.id);
    } else {
      return [];
    }

    if (applicationIds.length === 0 && elevatorIds.length === 0) return [];

    const certIds =
      elevatorIds.length > 0
        ? (
            await db.certificate.findMany({
              where: { elevatorId: { in: elevatorIds } },
              select: { id: true },
            })
          ).map((c) => c.id)
        : [];

    const links = await db.documentLink.findMany({
      where: {
        OR: [
          ...(applicationIds.length
            ? [{ entityType: "application", entityId: { in: applicationIds } }]
            : []),
          ...(elevatorIds.length
            ? [{ entityType: "elevator", entityId: { in: elevatorIds } }]
            : []),
          ...(certIds.length
            ? [{ entityType: "certificate", entityId: { in: certIds } }]
            : []),
        ],
      },
      include: {
        document: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const seen = new Set<string>();
    return links
      .filter((l) => !l.document.deletedAt && !seen.has(l.document.id) && seen.add(l.document.id))
      .map((l) => ({
        ...DocumentService.serializeDocument(l.document),
        entityType: l.entityType,
        entityId: l.entityId,
        purpose: l.purpose,
        reference: l.entityId.slice(0, 8),
      }));
  }
}
