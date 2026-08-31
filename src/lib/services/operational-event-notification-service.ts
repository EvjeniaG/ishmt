import { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";

export type OperationalEventTargets = {
  owner?: boolean;
  maintenance?: boolean;
  certifier?: boolean;
  ishmt?: boolean;
};

export type OperationalEventBroadcastInput = {
  elevatorId: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  targets?: OperationalEventTargets;
  /** Organizata shtesë (p.sh. OM nga kontrata e kontrollit periodik). */
  extraOrgIds?: string[];
};

const DEFAULT_TARGETS: OperationalEventTargets = {
  owner: true,
  maintenance: true,
  certifier: true,
  ishmt: true,
};

/** Njoftim simultan për të gjithë aktorët e lidhur me një ashensor. */
export class OperationalEventNotificationService {
  static async broadcastForElevator(input: OperationalEventBroadcastInput) {
    const elevator = await db.elevator.findFirst({
      where: { id: input.elevatorId, deletedAt: null },
      select: {
        id: true,
        registryNumber: true,
        ownerOrgId: true,
        maintenanceOrgId: true,
        certifierOrgId: true,
      },
    });
    if (!elevator) return { notifiedOrgs: 0 };

    const targets = { ...DEFAULT_TARGETS, ...input.targets };
    const payload = {
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? "elevator",
      entityId: input.entityId ?? elevator.id,
    };

    const orgIds = new Set<string>();
    if (targets.owner) orgIds.add(elevator.ownerOrgId);
    if (targets.maintenance && elevator.maintenanceOrgId) orgIds.add(elevator.maintenanceOrgId);
    if (targets.certifier && elevator.certifierOrgId) orgIds.add(elevator.certifierOrgId);
    for (const orgId of input.extraOrgIds ?? []) {
      if (orgId) orgIds.add(orgId);
    }

    await Promise.all([...orgIds].map((orgId) => NotificationService.notifyOrgMembers(orgId, payload)));

    if (targets.ishmt) {
      const ishmtOrg = await db.organization.findFirst({
        where: { type: OrgType.ISHMT, deletedAt: null },
        select: { id: true },
      });
      if (ishmtOrg) {
        await NotificationService.notifyIshmtOperationsStaff(ishmtOrg.id, payload);
      }
    }

    return { notifiedOrgs: orgIds.size + (targets.ishmt ? 1 : 0) };
  }
}
