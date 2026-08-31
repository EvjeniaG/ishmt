import { NotificationChannel, NotificationStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { isIshmtContractDeadlineNotifyExcludedRole } from "@/lib/notifications/field-inspector-notifications";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";

const ISHMT_OVERDUE_ENTITY_TYPE = "ishmt_compliance_alert";

function dedupeKey(userId: string, entityId: string, title: string) {
  return `${userId}:${entityId}:${title}`;
}

/** Njofton automatikisht stafin operacional të IQMT për afate të tejkaluara / kritike. */
export class IshmtOverdueNotificationService {
  static async syncOverdueAlerts(now = new Date()) {
    const ishmtOrg = await db.organization.findFirst({
      where: { type: OrgType.ISHMT, deletedAt: null },
      select: { id: true },
    });
    if (!ishmtOrg) return { created: 0, issues: 0 };

    const issues = await IshmtContractMonitorService.listAllFilteredIssues({}, 1000);
    const overdueIssues = issues.filter(
      (row) =>
        row.severity === "critical" ||
        (row.dueDate != null && row.dueDate.getTime() < now.getTime()),
    );

    if (overdueIssues.length === 0) return { created: 0, issues: 0 };

    const members = await db.orgMembership.findMany({
      where: { organizationId: ishmtOrg.id, deactivatedAt: null },
      select: { userId: true, role: { select: { code: true } } },
    });

    const staff = members.filter(
      (m) => !isIshmtContractDeadlineNotifyExcludedRole(m.role.code),
    );
    if (staff.length === 0) return { created: 0, issues: overdueIssues.length };

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const staffUserIds = staff.map((m) => m.userId);
    const elevatorIds = [...new Set(overdueIssues.map((issue) => issue.elevatorId))];

    const existing = await db.notification.findMany({
      where: {
        userId: { in: staffUserIds },
        entityType: ISHMT_OVERDUE_ENTITY_TYPE,
        entityId: { in: elevatorIds },
        OR: [{ readAt: null }, { createdAt: { gte: weekAgo } }],
      },
      select: { userId: true, entityId: true, title: true },
    });

    const existingKeys = new Set(
      existing.map((row) => dedupeKey(row.userId, row.entityId ?? "", row.title)),
    );

    const toCreate: Array<{
      userId: string;
      title: string;
      body: string;
      entityId: string;
    }> = [];

    for (const member of staff) {
      for (const issue of overdueIssues) {
        const title =
          issue.dueDate && issue.dueDate < now
            ? `Afat i tejkaluar: ${issue.issueLabel}`
            : `Kërkon veprim: ${issue.issueLabel}`;

        const key = dedupeKey(member.userId, issue.elevatorId, title);
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);

        toCreate.push({
          userId: member.userId,
          title,
          body: `Ashensori ${issue.registryNumber} · ${issue.buildingAddress}`,
          entityId: issue.elevatorId,
        });
      }
    }

    if (toCreate.length > 0) {
      await db.notification.createMany({
        data: toCreate.map((row) => ({
          userId: row.userId,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          title: row.title,
          body: row.body,
          entityType: ISHMT_OVERDUE_ENTITY_TYPE,
          entityId: row.entityId,
          sentAt: now,
        })),
      });
    }

    return { created: toCreate.length, issues: overdueIssues.length };
  }
}
