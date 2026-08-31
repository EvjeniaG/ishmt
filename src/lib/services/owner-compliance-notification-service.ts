import { db } from "@/lib/db";
import { COMPLIANCE_NOTIFY_COOLDOWN_DAYS } from "@/lib/ishmt/compliance-notify-feedback";

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

export type ComplianceNotifyBatchResult = {
  created: number;
  skipped: number;
  organizations: number;
  lastSentAt: Date | null;
  sentAt: Date | null;
};

type ComplianceNotifySyncResult = Pick<
  ComplianceNotifyBatchResult,
  "created" | "skipped" | "lastSentAt" | "sentAt"
>;

const emptyNotifySyncResult = (): ComplianceNotifySyncResult => ({
  created: 0,
  skipped: 0,
  lastSentAt: null,
  sentAt: null,
});

function mergeNotifyBatchResults(
  results: ComplianceNotifySyncResult[],
): ComplianceNotifySyncResult {
  return results.reduce(
    (acc, result) => ({
      created: acc.created + result.created,
      skipped: acc.skipped + result.skipped,
      lastSentAt:
        result.lastSentAt && (!acc.lastSentAt || result.lastSentAt > acc.lastSentAt)
          ? result.lastSentAt
          : acc.lastSentAt,
      sentAt:
        result.sentAt && (!acc.sentAt || result.sentAt > acc.sentAt)
          ? result.sentAt
          : acc.sentAt,
    }),
    emptyNotifySyncResult(),
  );
}

/** Njoftime in-app për pronarët dhe kompanitë - kontrata, afate, mungesa përputhshmërie. */
export class OwnerComplianceNotificationService {
  static async getLastNotifiedAtForScope(
    elevatorIds: string[],
    titles: string[],
  ): Promise<Date | null> {
    if (elevatorIds.length === 0 || titles.length === 0) return null;

    const row = await db.notification.findFirst({
      where: {
        entityType: "compliance_alert",
        entityId: { in: elevatorIds },
        title: { in: titles },
      },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      select: { sentAt: true, createdAt: true },
    });

    return row?.sentAt ?? row?.createdAt ?? null;
  }

  static async syncForOrganization(orgId: string, alerts: OwnerComplianceAlert[]) {
    if (alerts.length === 0) {
      return { created: 0, skipped: 0, lastSentAt: null as Date | null, sentAt: null as Date | null };
    }

    const members = await db.orgMembership.findMany({
      where: { organizationId: orgId, deactivatedAt: null },
      select: { userId: true },
    });
    if (members.length === 0) {
      return { created: 0, skipped: 0, lastSentAt: null as Date | null, sentAt: null as Date | null };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - COMPLIANCE_NOTIFY_COOLDOWN_DAYS);

    const userIds = members.map((m) => m.userId);
    const elevatorIds = [...new Set(alerts.map((alert) => alert.elevatorId))];
    const titles = [...new Set(alerts.map((alert) => alert.title))];

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

    let skipped = 0;

    for (const member of members) {
      for (const alert of alerts) {
        const key = `${member.userId}:${alert.elevatorId}:${alert.title}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        existingKeys.add(key);
        toCreate.push({
          userId: member.userId,
          title: alert.title,
          body: alert.body,
          entityId: alert.elevatorId,
        });
      }
    }

    const lastSentAt =
      skipped > 0
        ? await this.getLastNotifiedAtForScope(elevatorIds, titles)
        : null;

    if (toCreate.length === 0) {
      return { created: 0, skipped, lastSentAt, sentAt: null };
    }

    const sentAt = new Date();

    await db.notification.createMany({
      data: toCreate.map((row) => ({
        userId: row.userId,
        channel: "IN_APP" as const,
        status: "PENDING" as const,
        title: row.title,
        body: row.body,
        entityType: "compliance_alert",
        entityId: row.entityId,
        sentAt,
      })),
    });

    return { created: toCreate.length, skipped, lastSentAt, sentAt };
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

    const results: ComplianceNotifySyncResult[] = [];
    for (const orgId of orgIds) {
      results.push(await this.syncForOrganization(orgId, [alert]));
    }

    return { ...mergeNotifyBatchResults(results), organizations: orgIds.length };
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

    const results: ComplianceNotifySyncResult[] = [];
    for (const [orgId, alerts] of byOrg) {
      results.push(await this.syncForOrganization(orgId, alerts));
    }

    return { ...mergeNotifyBatchResults(results), organizations: byOrg.size };
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

  static async notifyStakeholdersForQrGaps(
    rows: Array<{ ownerOrgId: string; elevatorId: string; registryNumber: string }>,
  ) {
    const byOrg = new Map<string, OwnerComplianceAlert[]>();

    for (const row of rows) {
      const alert = this.alertsFromDeadlineItems([
        {
          type: "qr_placement",
          label: "Mungon fotografia e vendosjes së QR",
          elevatorId: row.elevatorId,
          registryNumber: row.registryNumber,
        },
      ])[0];
      if (!alert) continue;

      const existing = byOrg.get(row.ownerOrgId) ?? [];
      if (!existing.some((item) => item.dedupeKey === alert.dedupeKey)) {
        existing.push(alert);
        byOrg.set(row.ownerOrgId, existing);
      }
    }

    const results: ComplianceNotifySyncResult[] = [];
    for (const [orgId, alerts] of byOrg) {
      results.push(await this.syncForOrganization(orgId, alerts));
    }

    return { ...mergeNotifyBatchResults(results), organizations: byOrg.size };
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
        href = `/portal/kontroll-periodik`;
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
