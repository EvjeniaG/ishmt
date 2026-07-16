import { db } from "@/lib/db";

export type OwnerComplianceAlert = {
  dedupeKey: string;
  title: string;
  body: string;
  elevatorId: string;
  href: string;
};

function isMaintenanceIssueType(issueType: string): boolean {
  return (
    issueType.includes("maintenance") ||
    issueType === "no-maintenance-contract" ||
    issueType === "missing-maintenance-company" ||
    issueType === "missing-maintenance-record" ||
    issueType === "maintenance-invalid" ||
    issueType === "maintenance-expiring"
  );
}

function isInspectionIssueType(issueType: string): boolean {
  return (
    issueType.includes("inspection") ||
    issueType === "no-inspection-contract" ||
    issueType === "missing-inspection" ||
    issueType === "inspection-invalid" ||
    issueType === "inspection-expiring"
  );
}

/** Njoftime in-app për pronarët dhe kompanitë - kontrata, afate, mungesa përputhshmërie. */
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

    const userIds = members.map((m) => m.userId);
    const elevatorIds = [...new Set(alerts.map((alert) => alert.elevatorId))];

    const existing = await db.notification.findMany({
      where: {
        userId: { in: userIds },
        entityType: "compliance_alert",
        entityId: { in: elevatorIds },
        OR: [{ readAt: null }, { createdAt: { gte: weekAgo } }],
      },
      select: { userId: true, entityId: true, title: true },
    });

    const existingKeys = new Set(
      existing.map((row) => `${row.userId}:${row.entityId ?? ""}:${row.title}`),
    );

    const toCreate: Array<{
      userId: string;
      title: string;
      body: string;
      entityId: string;
    }> = [];

    for (const member of members) {
      for (const alert of alerts) {
        const key = `${member.userId}:${alert.elevatorId}:${alert.title}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        toCreate.push({
          userId: member.userId,
          title: alert.title,
          body: alert.body,
          entityId: alert.elevatorId,
        });
      }
    }

    if (toCreate.length === 0) return { created: 0 };

    await db.notification.createMany({
      data: toCreate.map((row) => ({
        userId: row.userId,
        channel: "IN_APP" as const,
        status: "PENDING" as const,
        title: row.title,
        body: row.body,
        entityType: "compliance_alert",
        entityId: row.entityId,
        sentAt: new Date(),
      })),
    });

    return { created: toCreate.length };
  }

  static resolveStakeholderOrgIds(row: {
    ownerOrgId: string;
    maintenanceOrgId?: string | null;
    certifierOrgId?: string | null;
    issueType: string;
  }): string[] {
    const ids = new Set<string>([row.ownerOrgId]);

    if (isMaintenanceIssueType(row.issueType) && row.maintenanceOrgId) {
      ids.add(row.maintenanceOrgId);
    }
    if (isInspectionIssueType(row.issueType) && row.certifierOrgId) {
      ids.add(row.certifierOrgId);
    }

    return [...ids];
  }

  static async notifyStakeholdersForContractIssue(row: {
    ownerOrgId: string;
    maintenanceOrgId?: string | null;
    certifierOrgId?: string | null;
    elevatorId: string;
    issueType: string;
    issueLabel: string;
    registryNumber: string;
    dueDate: Date | null;
  }) {
    const alert = this.alertFromContractIssue(row);
    const orgIds = this.resolveStakeholderOrgIds(row);

    let created = 0;
    for (const orgId of orgIds) {
      const result = await this.syncForOrganization(orgId, [alert]);
      created += result.created;
    }

    return { organizations: orgIds.length, created };
  }

  static async notifyStakeholdersForContractIssues(
    rows: Array<{
      ownerOrgId: string;
      maintenanceOrgId?: string | null;
      certifierOrgId?: string | null;
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
      for (const orgId of this.resolveStakeholderOrgIds(row)) {
        const existing = byOrg.get(orgId) ?? [];
        if (!existing.some((a) => a.dedupeKey === alert.dedupeKey)) {
          existing.push(alert);
          byOrg.set(orgId, existing);
        }
      }
    }

    let created = 0;
    for (const [orgId, alerts] of byOrg) {
      const result = await this.syncForOrganization(orgId, alerts);
      created += result.created;
    }

    return { organizations: byOrg.size, created };
  }

  static async notifyForContractIssue(row: {
    ownerOrgId: string;
    maintenanceOrgId?: string | null;
    certifierOrgId?: string | null;
    elevatorId: string;
    issueType: string;
    issueLabel: string;
    registryNumber: string;
    dueDate: Date | null;
  }) {
    return this.notifyStakeholdersForContractIssue(row);
  }

  static async notifyForContractIssues(
    rows: Array<{
      ownerOrgId: string;
      maintenanceOrgId?: string | null;
      certifierOrgId?: string | null;
      elevatorId: string;
      issueType: string;
      issueLabel: string;
      registryNumber: string;
      dueDate: Date | null;
    }>,
  ) {
    return this.notifyStakeholdersForContractIssues(rows);
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
