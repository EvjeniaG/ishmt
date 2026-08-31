import { db } from "@/lib/db";
import type { ApplicationStatus } from "@prisma/client";
import {
  formatInspectionFindings,
  isLegacyImportFindings,
} from "@/lib/elevators/format-inspection-findings";
import {
  displayLegacyActorName,
  isLegacyMigrationApplicationNumber,
  LEGACY_REGISTRY_ATTRIBUTION,
} from "@/lib/migration/legacy-display";
import {
  formatWorkflowHistoryLine,
  labelApplicationType,
  labelCertificateStatus,
  labelCertificateType,
  labelElevatorStatus,
} from "@/lib/constants/display-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  PERIODIC: "periodik",
  EXTRAORDINARY: "jashtëzakonshme",
  INITIAL: "fillestar",
  FOLLOW_UP: "pasues",
};

const INSPECTION_RESULT_LABELS: Record<string, string> = {
  PASS: "Konform",
  FAIL: "Jo konform",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  ROUTINE: "Mirëmbajtje rutinë",
  ANNUAL_SERVICE: "Shërbim vjetor",
  EMERGENCY: "Ndërhyrje emergjence",
  MODERNIZATION: "Modernizim",
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Në pritje",
  ACTIVE: "Aktive",
  REJECTED: "Refuzuar",
  EXPIRED: "E skaduar",
  TERMINATED: "E përfunduar",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: "Mirëmbajtje",
  PERIODIC_INSPECTION: "Inspektim periodik",
};

export type TimelineEvent = {
  id: string;
  kind: "workflow" | "lifecycle";
  title: string;
  description?: string;
  occurredAt: Date;
  actorName?: string;
  applicationId?: string;
  applicationNumber?: string;
  applicationTypeLabel?: string;
};

type ApplicationBlock = {
  id: string;
  applicationNumber: string;
  applicationTypeLabel: string;
  createdAt: Date;
  workflowEntries: TimelineEvent[];
};

function labelInspectionType(type: string): string {
  return INSPECTION_TYPE_LABELS[type] ?? type.toLowerCase();
}

function labelInspectionResult(result: string | null): string {
  if (!result) return "-";
  return INSPECTION_RESULT_LABELS[result] ?? result;
}

function labelMaintenanceRecord(type: string, interventionType: string | null): string {
  if (interventionType?.trim()) return interventionType.trim();
  return MAINTENANCE_TYPE_LABELS[type] ?? type;
}

function labelContractEvent(
  serviceType: string,
  status: string,
  phase: "proposed" | "responded",
): string {
  const service = SERVICE_TYPE_LABELS[serviceType] ?? serviceType;
  if (phase === "proposed") {
    return `Kontratë ${service.toLowerCase()} e propozuar`;
  }
  const statusLabel = CONTRACT_STATUS_LABELS[status] ?? status.toLowerCase();
  return `Kontratë ${service.toLowerCase()}: ${statusLabel}`;
}

function mergeWorkflowAndLifecycle(appBlocks: ApplicationBlock[], lifecycle: TimelineEvent[]): TimelineEvent[] {
  const result: TimelineEvent[] = [];
  const ops = [...lifecycle].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  let opIdx = 0;

  for (let i = 0; i < appBlocks.length; i++) {
    const app = appBlocks[i];
    const nextAppStart =
      i + 1 < appBlocks.length ? appBlocks[i + 1].createdAt.getTime() : Number.POSITIVE_INFINITY;

    for (const entry of app.workflowEntries) {
      while (
        opIdx < ops.length &&
        ops[opIdx].occurredAt.getTime() <= entry.occurredAt.getTime() &&
        ops[opIdx].occurredAt.getTime() < nextAppStart
      ) {
        result.push(ops[opIdx++]);
      }
      result.push(entry);
    }

    while (opIdx < ops.length && ops[opIdx].occurredAt.getTime() < nextAppStart) {
      result.push(ops[opIdx++]);
    }
  }

  while (opIdx < ops.length) {
    result.push(ops[opIdx++]);
  }

  return result;
}

export class ElevatorTimelineService {
  static async buildTimeline(elevatorId: string, limit = 150): Promise<TimelineEvent[]> {
    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      select: {
        id: true,
        applicationId: true,
        originatingApplication: { select: { applicationNumber: true } },
      },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    const legacyMigration = isLegacyMigrationApplicationNumber(
      elevator.originatingApplication?.applicationNumber,
    );

    const applicationWhere =
      elevator.applicationId != null
        ? { OR: [{ elevatorId }, { id: elevator.applicationId }] }
        : { elevatorId };

    const [
      applications,
      statusHistory,
      ownershipHistory,
      inspections,
      maintenanceRecords,
      certificates,
      maintenanceContracts,
    ] = await Promise.all([
      db.application.findMany({
        where: applicationWhere,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          applicationNumber: true,
          type: true,
          data: true,
          createdAt: true,
          workflowHistory: {
            orderBy: { createdAt: "asc" },
            include: {
              actor: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      db.elevatorStatusHistory.findMany({
        where: { elevatorId },
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
        take: limit,
      }),
      db.elevatorOwnershipHistory.findMany({
        where: { elevatorId },
        include: {
          oldOwner: { select: { name: true } },
          newOwner: { select: { name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      }),
      db.inspection.findMany({
        where: { elevatorId },
        include: { inspector: { select: { firstName: true, lastName: true } } },
        orderBy: { conductedDate: "asc" },
        take: limit,
      }),
      db.maintenanceRecord.findMany({
        where: { elevatorId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { performedDate: "asc" },
        take: limit,
      }),
      db.certificate.findMany({
        where: { elevatorId },
        orderBy: { issuedDate: "asc" },
        take: limit,
      }),
      db.maintenanceContract.findMany({
        where: { elevatorId },
        include: { maintenanceOrg: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
        take: limit,
      }),
    ]);

    const uniqueApplications = [...new Map(applications.map((app) => [app.id, app])).values()].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );

    const appBlocks: ApplicationBlock[] = uniqueApplications.map((app) => {
      const applicationTypeLabel = labelApplicationType(
        app.type,
        (app.data as { updateType?: string } | null)?.updateType,
      );

      const workflowEntries = app.workflowHistory.map((entry) => ({
        id: `workflow-${entry.id}`,
        kind: "workflow" as const,
        title: formatWorkflowHistoryLine({
          fromStatus: entry.fromStatus as ApplicationStatus | null,
          toStatus: entry.toStatus,
          action: entry.action,
          statusLabels: APPLICATION_STATUS_LABELS,
        }),
        description: entry.comment?.trim() || undefined,
        occurredAt: entry.createdAt,
        actorName: displayLegacyActorName(entry.actor, {
          applicationNumber: app.applicationNumber,
        }),
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        applicationTypeLabel,
      }));

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        applicationTypeLabel,
        createdAt: app.createdAt,
        workflowEntries,
      };
    });

    const lifecycle: TimelineEvent[] = [];

    for (const status of statusHistory) {
      lifecycle.push({
        id: `status-${status.id}`,
        kind: "lifecycle",
        title: `${labelElevatorStatus(status.fromStatus)} → ${labelElevatorStatus(status.toStatus)}`,
        description: status.reason?.trim() || undefined,
        occurredAt: status.createdAt,
        actorName: legacyMigration
          ? LEGACY_REGISTRY_ATTRIBUTION
          : `${status.actor.firstName} ${status.actor.lastName}`,
      });
    }

    for (const ownership of ownershipHistory) {
      lifecycle.push({
        id: `ownership-${ownership.id}`,
        kind: "lifecycle",
        title: `Ndryshim pronësie: ${ownership.oldOwner.name} → ${ownership.newOwner.name}`,
        description: ownership.reason?.trim() || undefined,
        occurredAt: ownership.createdAt,
        actorName: legacyMigration
          ? LEGACY_REGISTRY_ATTRIBUTION
          : `${ownership.createdBy.firstName} ${ownership.createdBy.lastName}`,
      });
    }

    for (const inspection of inspections) {
      lifecycle.push({
        id: `inspection-${inspection.id}`,
        kind: "lifecycle",
        title: `Inspektim ${labelInspectionType(inspection.type)}: ${labelInspectionResult(inspection.result)}`,
        description: formatInspectionFindings(inspection.findings) ?? undefined,
        occurredAt: inspection.conductedDate ?? inspection.scheduledDate,
        actorName:
          isLegacyImportFindings(inspection.findings) ||
          inspection.findings?.trim().startsWith("K/INSP:") ||
          legacyMigration
            ? LEGACY_REGISTRY_ATTRIBUTION
            : `${inspection.inspector.firstName} ${inspection.inspector.lastName}`,
      });
    }

    for (const record of maintenanceRecords) {
      lifecycle.push({
        id: `maintenance-${record.id}`,
        kind: "lifecycle",
        title: labelMaintenanceRecord(record.type, record.interventionType),
        description: record.description?.trim() || undefined,
        occurredAt: record.performedDate,
        actorName: `${record.createdBy.firstName} ${record.createdBy.lastName}`,
      });
    }

    for (const certificate of certificates) {
      lifecycle.push({
        id: `certificate-${certificate.id}`,
        kind: "lifecycle",
        title: `Certifikatë ${labelCertificateType(certificate.type).toLowerCase()}, nr. ${certificate.certificateNumber}`,
        description: labelCertificateStatus(certificate.status),
        occurredAt: new Date(certificate.issuedDate),
      });
    }

    for (const contract of maintenanceContracts) {
      lifecycle.push({
        id: `contract-proposed-${contract.id}`,
        kind: "lifecycle",
        title: labelContractEvent(contract.serviceType, contract.status, "proposed"),
        description: contract.maintenanceOrg.name,
        occurredAt: contract.createdAt,
      });

      if (contract.respondedAt) {
        lifecycle.push({
          id: `contract-responded-${contract.id}`,
          kind: "lifecycle",
          title: labelContractEvent(contract.serviceType, contract.status, "responded"),
          description:
            contract.status === "REJECTED" && contract.rejectionReason?.trim()
              ? contract.rejectionReason.trim()
              : contract.maintenanceOrg.name,
          occurredAt: contract.respondedAt,
        });
      }
    }

    return mergeWorkflowAndLifecycle(appBlocks, lifecycle).slice(0, limit);
  }
}
