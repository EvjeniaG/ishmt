import { ElevatorStatus, NotificationChannel, NotificationStatus, OrgType } from "@prisma/client";
import { ROLE_CODES } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { withDemoDataElevatorScope } from "@/lib/demo/demo-data-mode";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";

export const ISHMT_COMPLIANCE_DIGEST_ENTITY_TYPE = "ishmt_compliance_digest";

const QR_NOTIFY_TITLE = "Mungon fotografia e vendosjes së QR";
const NOTIFY_STATUS_BATCH_MAX = 1000;

const LEADERSHIP_ROLES = [
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.SECTOR_HEAD,
] as const;

const ACTIVE_ELEVATOR = {
  deletedAt: null,
  status: ElevatorStatus.ACTIVE,
} as const;

export type IshmtComplianceDigestSnapshot = {
  dateKey: string;
  maintenanceContractExpired: number;
  inspectionContractExpired: number;
  contractsExpiredTotal: number;
  inspectionContractExpiring30: number;
  missingQrElevators: number;
  missingQrCompanies: number;
};

export type IshmtQrGapRow = {
  elevatorId: string;
  ownerOrgId: string;
  registryNumber: string;
};

export type IshmtDigestSectionNotifyStatus = Record<
  "expired" | "inp-30" | "qr",
  string | null
>;

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDigestTitle(): string {
  return "Përmbledhje ditore e përputhshmërisë";
}

function buildDigestBody(snapshot: IshmtComplianceDigestSnapshot): string {
  const lines = [
    `${snapshot.contractsExpiredTotal} ashensorë me kontratë të skaduar (${snapshot.maintenanceContractExpired} mirëmbajtje, ${snapshot.inspectionContractExpired} kontroll periodik).`,
    `${snapshot.inspectionContractExpiring30} ashensorë me kontratë INP që skadon brenda 30 ditëve.`,
    `${snapshot.missingQrCompanies} kompani/pronarë me ${snapshot.missingQrElevators} ashensorë pa vendosje QR.`,
  ];
  return lines.join(" ");
}

/** Agregon treguesit ditorë për kryeinspektorin, drejtorin dhe përgjegjësin e sektorit. */
export class IshmtComplianceDigestService {
  static async getSnapshot(now = new Date()): Promise<IshmtComplianceDigestSnapshot> {
    const [contractStats, missingQrElevators, missingQrCompanies] = await Promise.all([
      IshmtContractMonitorService.getNationalStats(),
      this.countMissingQrElevators(),
      this.countMissingQrCompanies(),
    ]);

    return {
      dateKey: formatDateKey(now),
      maintenanceContractExpired: contractStats.maintenanceContractExpired,
      inspectionContractExpired: contractStats.inspectionContractExpired,
      contractsExpiredTotal:
        contractStats.maintenanceContractExpired + contractStats.inspectionContractExpired,
      inspectionContractExpiring30: contractStats.inspectionContractExpiring30,
      missingQrElevators,
      missingQrCompanies,
    };
  }

  static async countMissingQrElevators(): Promise<number> {
    return db.elevator.count({
      where: withDemoDataElevatorScope({
        ...ACTIVE_ELEVATOR,
        OR: [
          { qrCodes: { none: { isActive: true } } },
          {
            qrCodes: {
              some: {
                isActive: true,
                placementPhotoDocumentId: null,
              },
            },
          },
        ],
      }),
    });
  }

  static async countMissingQrCompanies(): Promise<number> {
    const rows = await db.elevator.findMany({
      where: withDemoDataElevatorScope({
        ...ACTIVE_ELEVATOR,
        OR: [
          { qrCodes: { none: { isActive: true } } },
          {
            qrCodes: {
              some: {
                isActive: true,
                placementPhotoDocumentId: null,
              },
            },
          },
        ],
      }),
      select: { ownerOrgId: true },
      distinct: ["ownerOrgId"],
    });
    return rows.length;
  }

  static async listMissingQrGaps(maxRows = 1000): Promise<IshmtQrGapRow[]> {
    const elevators = await db.elevator.findMany({
      where: withDemoDataElevatorScope({
        ...ACTIVE_ELEVATOR,
        OR: [
          { qrCodes: { none: { isActive: true } } },
          {
            qrCodes: {
              some: {
                isActive: true,
                placementPhotoDocumentId: null,
              },
            },
          },
        ],
      }),
      select: {
        id: true,
        ownerOrgId: true,
        registryNumber: true,
      },
      orderBy: { registryNumber: "asc" },
      take: maxRows,
    });

    return elevators.map((row) => ({
      elevatorId: row.id,
      ownerOrgId: row.ownerOrgId,
      registryNumber: row.registryNumber,
    }));
  }

  static async getHighlightSectionNotifyStatus(
    snapshot: IshmtComplianceDigestSnapshot,
  ): Promise<IshmtDigestSectionNotifyStatus> {
    const [expiredRows, expiringRows, qrRows] = await Promise.all([
      snapshot.contractsExpiredTotal > 0
        ? IshmtContractMonitorService.listAllFilteredIssues(
            { issueCategory: "expired" },
            NOTIFY_STATUS_BATCH_MAX,
          )
        : Promise.resolve([]),
      snapshot.inspectionContractExpiring30 > 0
        ? IshmtContractMonitorService.listAllFilteredIssues(
            {
              issue: "inspection-contract-expiring",
              expiringWithin: 30,
            },
            NOTIFY_STATUS_BATCH_MAX,
          )
        : Promise.resolve([]),
      snapshot.missingQrElevators > 0
        ? this.listMissingQrGaps(NOTIFY_STATUS_BATCH_MAX)
        : Promise.resolve([]),
    ]);

    const [expiredAt, expiringAt, qrAt] = await Promise.all([
      expiredRows.length > 0
        ? OwnerComplianceNotificationService.getLastNotifiedAtForScope(
            expiredRows.map((row) => row.elevatorId),
            [...new Set(expiredRows.map((row) => row.issueLabel))],
          )
        : Promise.resolve(null),
      expiringRows.length > 0
        ? OwnerComplianceNotificationService.getLastNotifiedAtForScope(
            expiringRows.map((row) => row.elevatorId),
            [...new Set(expiringRows.map((row) => row.issueLabel))],
          )
        : Promise.resolve(null),
      qrRows.length > 0
        ? OwnerComplianceNotificationService.getLastNotifiedAtForScope(
            qrRows.map((row) => row.elevatorId),
            [QR_NOTIFY_TITLE],
          )
        : Promise.resolve(null),
    ]);

    return {
      expired: expiredAt?.toISOString() ?? null,
      "inp-30": expiringAt?.toISOString() ?? null,
      qr: qrAt?.toISOString() ?? null,
    };
  }

  /** Dërgon një njoftim ditor për çdo përdorues me rol drejtues. */
  static async syncDailyDigest(now = new Date()) {
    const snapshot = await this.getSnapshot(now);
    const hasSignal =
      snapshot.contractsExpiredTotal > 0 ||
      snapshot.inspectionContractExpiring30 > 0 ||
      snapshot.missingQrCompanies > 0;

    if (!hasSignal) {
      return { created: 0, recipients: 0, snapshot };
    }

    const ishmtOrg = await db.organization.findFirst({
      where: { type: OrgType.ISHMT, deletedAt: null },
      select: { id: true },
    });
    if (!ishmtOrg) return { created: 0, recipients: 0, snapshot };

    const members = await db.orgMembership.findMany({
      where: {
        organizationId: ishmtOrg.id,
        deactivatedAt: null,
        role: { code: { in: [...LEADERSHIP_ROLES] } },
      },
      select: { userId: true },
    });

    if (members.length === 0) return { created: 0, recipients: 0, snapshot };

    const title = buildDigestTitle();
    const body = buildDigestBody(snapshot);
    const entityId = snapshot.dateKey;

    const existing = await db.notification.findMany({
      where: {
        userId: { in: members.map((m) => m.userId) },
        entityType: ISHMT_COMPLIANCE_DIGEST_ENTITY_TYPE,
        entityId,
        title,
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existing.map((row) => row.userId));
    const toCreate = members.filter((m) => !existingUserIds.has(m.userId));

    if (toCreate.length > 0) {
      await db.notification.createMany({
        data: toCreate.map((member) => ({
          userId: member.userId,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          title,
          body,
          entityType: ISHMT_COMPLIANCE_DIGEST_ENTITY_TYPE,
          entityId,
          sentAt: now,
        })),
      });
    }

    return { created: toCreate.length, recipients: members.length, snapshot };
  }
}
