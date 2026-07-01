import { ElevatorStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";

export type OwnerComplianceAlert = {
  dedupeKey: string;
  title: string;
  body: string;
  elevatorId: string;
  href: string;
};

/** Njoftime in-app për pronarët - kontrata, afate, mungesa përputhshmërie. */
export class OwnerComplianceNotificationService {
  static async syncForOrganization(orgId: string, alerts: OwnerComplianceAlert[]) {
    if (alerts.length === 0) return { created: 0 };

    const members = await db.orgMembership.findMany({
      where: { organizationId: orgId, deactivatedAt: null },
      select: { userId: true },
    });
    if (members.length === 0) return { created: 0 };

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let created = 0;

    for (const member of members) {
      for (const alert of alerts) {
        const recent = await db.notification.findFirst({
          where: {
            userId: member.userId,
            entityType: "compliance_alert",
            entityId: alert.elevatorId,
            title: alert.title,
            OR: [{ readAt: null }, { createdAt: { gte: weekAgo } }],
          },
        });
        if (recent) continue;

        await NotificationService.create({
          userId: member.userId,
          title: alert.title,
          body: alert.body,
          entityType: "compliance_alert",
          entityId: alert.elevatorId,
        });
        created += 1;
      }
    }

    return { created };
  }

  static alertFromContractIssue(row: {
    elevatorId: string;
    issueType: string;
    issueLabel: string;
    registryNumber: string;
    dueDate: Date | null;
  }): OwnerComplianceAlert {
    return this.alertsFromDeadlineItems([
      {
        type: row.issueType,
        label: row.issueLabel,
        elevatorId: row.elevatorId,
        registryNumber: row.registryNumber,
        date: row.dueDate ?? undefined,
      },
    ])[0]!;
  }

  static async notifyForContractIssue(row: {
    ownerOrgId: string;
    elevatorId: string;
    issueType: string;
    issueLabel: string;
    registryNumber: string;
    dueDate: Date | null;
  }) {
    return this.syncForOrganization(row.ownerOrgId, [this.alertFromContractIssue(row)]);
  }

  static async notifyForContractIssues(
    rows: Array<{
      ownerOrgId: string;
      elevatorId: string;
      issueType: string;
      issueLabel: string;
      registryNumber: string;
      dueDate: Date | null;
    }>,
  ) {
    const byOrg = new Map<string, OwnerComplianceAlert[]>();

    for (const row of rows) {
      const alert = this.alertFromContractIssue(row);
      const existing = byOrg.get(row.ownerOrgId) ?? [];
      if (!existing.some((a) => a.dedupeKey === alert.dedupeKey)) {
        existing.push(alert);
        byOrg.set(row.ownerOrgId, existing);
      }
    }

    let created = 0;
    for (const [orgId, alerts] of byOrg) {
      const result = await this.syncForOrganization(orgId, alerts);
      created += result.created;
    }

    return { organizations: byOrg.size, created };
  }

  static alertsFromDeadlineItems(
    items: {
      type: string;
      label: string;
      elevatorId: string;
      registryNumber: string;
      date?: Date;
    }[],
  ): OwnerComplianceAlert[] {
    return items.map((item) => {
      const dateHint = item.date
        ? ` Afati: ${item.date.toLocaleDateString("sq-AL")}.`
        : "";

      let href = `/portal/elevators/${item.elevatorId}`;
      if (item.type === "qr_placement") {
        href = `/portal/elevators/${item.elevatorId}?tab=qr`;
      } else if (
        item.type.includes("maintenance") ||
        item.type === "missing-maintenance-company" ||
        item.type === "missing-maintenance-contract" ||
        item.type === "pending-maintenance-contract" ||
        item.type === "maintenance-contract-expiring" ||
        item.type === "maintenance-contract-expired"
      ) {
        href = `/portal/maintenance`;
      } else if (
        item.type.includes("inspection") ||
        item.type === "missing-inspection-contract" ||
        item.type === "pending-inspection-contract" ||
        item.type === "inspection-contract-expiring" ||
        item.type === "inspection-contract-expired"
      ) {
        href = `/portal/elevators/${item.elevatorId}?tab=inspections`;
      }

      return {
        dedupeKey: `${item.elevatorId}:${item.type}`,
        title: item.label,
        body: `Ashensori ${item.registryNumber}.${dateHint}`,
        elevatorId: item.elevatorId,
        href,
      };
    });
  }
}
