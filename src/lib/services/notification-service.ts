import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { db } from "@/lib/db";

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
  ) {
    const memberships = await db.orgMembership.findMany({
      where: { organizationId, deactivatedAt: null },
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

  static async listForUser(userId: string, limit = 50) {
    return db.notification.findMany({
      where: { userId },
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

  static async unreadCount(userId: string) {
    return db.notification.count({
      where: { userId, readAt: null },
    });
  }
}
