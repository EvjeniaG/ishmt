import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  filterActiveNotifications,
  pruneStaleNotifications,
} from "@/lib/notifications/stale-notification-pruner";
import {
  ISHMT_OPERATIONS_NOTIFY_EXCLUDED_ROLES,
  notificationWhereForRole,
} from "@/lib/notifications/field-inspector-notifications";
import {
  getNotificationHref,
  getNotificationHrefForContract,
  getNotificationHrefForElevator,
  type NotificationHrefContext,
  notificationsBaseHrefForPath,
  pathMatchesNotificationHref,
  serializeNotificationForClient,
} from "@/lib/notifications/get-notification-href";

export type NotificationDisplayItem = ReturnType<typeof serializeNotificationForClient> & {
  href: string | null;
};

export class NotificationService {
  static async create(input: {
    userId: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
  }) {
    return db.notification.create({
      data: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        title: input.title,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
        sentAt: new Date(),
      },
    });
  }

  static async notifyOrgMembers(
    organizationId: string,
    input: { title: string; body: string; entityType?: string; entityId?: string },
    options?: { excludeMembershipRoleCodes?: readonly string[] },
  ) {
    const memberships = await db.orgMembership.findMany({
      where: {
        organizationId,
        deactivatedAt: null,
        ...(options?.excludeMembershipRoleCodes?.length
          ? { role: { code: { notIn: [...options.excludeMembershipRoleCodes] } } }
          : {}),
      },
      select: { userId: true },
    });

    await Promise.all(
      memberships.map((m) =>
        this.create({
          userId: m.userId,
          title: input.title,
          body: input.body,
          entityType: input.entityType,
          entityId: input.entityId,
        }),
      ),
    );
  }

  /** Njofton stafin operacional të IQMT, duke përjashtuar inspektorin e terrenit. */
  static async notifyIshmtOperationsStaff(
    organizationId: string,
    input: { title: string; body: string; entityType?: string; entityId?: string },
  ) {
    return this.notifyOrgMembers(organizationId, input, {
      excludeMembershipRoleCodes: ISHMT_OPERATIONS_NOTIFY_EXCLUDED_ROLES,
    });
  }

  static async listForUser(userId: string, limit = 50, roleCode?: string | null) {
    await pruneStaleNotifications({ userId }).catch(() => undefined);

    const rows = await db.notification.findMany({
      where: notificationWhereForRole(userId, roleCode),
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return filterActiveNotifications(rows);
  }

  static async listForDisplay(
    userId: string,
    options: {
      limit?: number;
      roleCode?: string | null;
      notificationsHref: string;
    },
  ): Promise<NotificationDisplayItem[]> {
    const rows = await this.listForUser(userId, options.limit ?? 50, options.roleCode);
    const hrefs = await Promise.all(
      rows.map((row) =>
        this.resolveNotificationHref(row.entityType, row.entityId, options.notificationsHref, {
          title: row.title,
          body: row.body,
        }),
      ),
    );
    return rows.map((row, index) => ({
      ...serializeNotificationForClient(row),
      href: hrefs[index],
    }));
  }

  static async markRead(userId: string, notificationId: string) {
    return db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  private static async resolveNotificationHref(
    entityType: string | null,
    entityId: string | null,
    notificationsHref: string,
    context?: NotificationHrefContext,
  ): Promise<string | null> {
    const direct = getNotificationHref(entityType, entityId, notificationsHref, context);
    if (direct) return direct;
    if (!entityType || !entityId) return null;

    const type = entityType.trim().toLowerCase();

    if (type === "maintenance_contract") {
      const contract = await db.maintenanceContract.findUnique({
        where: { id: entityId },
        select: { elevatorId: true, serviceType: true },
      });
      if (contract) {
        return getNotificationHrefForElevator(contract.elevatorId, notificationsHref);
      }
      return getNotificationHrefForContract(entityId, notificationsHref);
    }

    if (type === "inspection") {
      const inspection = await db.inspection.findUnique({
        where: { id: entityId },
        select: { elevatorId: true },
      });
      if (inspection?.elevatorId) {
        return getNotificationHrefForElevator(inspection.elevatorId, notificationsHref);
      }
    }

    if (type === "certificate") {
      const certificate = await db.certificate.findUnique({
        where: { id: entityId },
        select: { elevatorId: true },
      });
      if (certificate?.elevatorId) {
        return getNotificationHrefForElevator(certificate.elevatorId, notificationsHref);
      }
    }

    if (type === "maintenance_record" || type === "maintenance_monthly_report") {
      const record = await db.maintenanceRecord.findUnique({
        where: { id: entityId },
        select: { elevatorId: true },
      });
      if (record?.elevatorId) {
        return getNotificationHrefForElevator(record.elevatorId, notificationsHref);
      }
    }

    return null;
  }

  /** Marks unread notifications whose target page matches the current route. */
  static async markReadForMatchingPath(
    userId: string,
    pathname: string,
    roleCode?: string | null,
  ) {
    const notificationsHref = notificationsBaseHrefForPath(pathname);
    const unread = await db.notification.findMany({
      where: {
        ...notificationWhereForRole(userId, roleCode),
        readAt: null,
      },
      select: { id: true, entityType: true, entityId: true, title: true, body: true },
    });

    const idsToMark: string[] = [];
    for (const notification of unread) {
      const href = await this.resolveNotificationHref(
        notification.entityType,
        notification.entityId,
        notificationsHref,
        { title: notification.title, body: notification.body },
      );
      if (href && pathMatchesNotificationHref(href, pathname)) {
        idsToMark.push(notification.id);
      }
    }

    if (idsToMark.length === 0) return { marked: 0 };

    await db.notification.updateMany({
      where: { id: { in: idsToMark }, userId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });

    return { marked: idsToMark.length };
  }

  static async markAllUnreadRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  static async unreadCount(userId: string, roleCode?: string | null) {
    const rows = await db.notification.findMany({
      where: {
        ...notificationWhereForRole(userId, roleCode),
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const active = await filterActiveNotifications(rows);
    return active.length;
  }

  static async pruneStaleForAllUsers() {
    return pruneStaleNotifications({ includeRead: false });
  }
}
