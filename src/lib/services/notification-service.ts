import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ISHMT_OPERATIONS_NOTIFY_EXCLUDED_ROLES,
  notificationWhereForRole,
} from "@/lib/notifications/field-inspector-notifications";

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

  /** Njofton stafin operacional të ISHMT, duke përjashtuar inspektorin e terrenit. */
  static async notifyIshmtOperationsStaff(
    organizationId: string,
    input: { title: string; body: string; entityType?: string; entityId?: string },
  ) {
    return this.notifyOrgMembers(organizationId, input, {
      excludeMembershipRoleCodes: ISHMT_OPERATIONS_NOTIFY_EXCLUDED_ROLES,
    });
  }

  static async listForUser(userId: string, limit = 50, roleCode?: string | null) {
    return db.notification.findMany({
      where: notificationWhereForRole(userId, roleCode),
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async markRead(userId: string, notificationId: string) {
    return db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  static async markAllUnreadRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  static async unreadCount(userId: string, roleCode?: string | null) {
    return db.notification.count({
      where: {
        ...notificationWhereForRole(userId, roleCode),
        readAt: null,
      },
    });
  }
}
