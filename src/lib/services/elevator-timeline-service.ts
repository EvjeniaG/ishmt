import { db } from "@/lib/db";
import {
  formatInspectionFindings,
  isLegacyImportFindings,
} from "@/lib/elevators/format-inspection-findings";
import {
  displayLegacyActorName,
  isLegacyMigrationApplicationNumber,
  LEGACY_REGISTRY_ATTRIBUTION,
} from "@/lib/migration/legacy-display";

export type TimelineEvent = {
  id: string;
  category:
    | "status"
    | "ownership"
    | "application"
    | "inspection"
    | "maintenance"
    | "certificate"
    | "audit";
  title: string;
  description?: string;
  occurredAt: Date;
  actorName?: string;
  metadata?: Record<string, unknown>;
};

export class ElevatorTimelineService {
  static async buildTimeline(elevatorId: string, limit = 100): Promise<TimelineEvent[]> {
    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      select: {
        id: true,
        applicationId: true,
        registryNumber: true,
        originatingApplication: { select: { applicationNumber: true } },
      },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    const legacyMigration = isLegacyMigrationApplicationNumber(
      elevator.originatingApplication?.applicationNumber,
    );

    const [
      statusHistory,
      ownershipHistory,
      workflowHistory,
      inspections,
      maintenanceRecords,
      certificates,
      auditLogs,
    ] = await Promise.all([
      db.elevatorStatusHistory.findMany({
        where: { elevatorId },
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.elevatorOwnershipHistory.findMany({
        where: { elevatorId },
        include: {
          oldOwner: { select: { name: true } },
          newOwner: { select: { name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.applicationWorkflowHistory.findMany({
        where: {
          application: {
            OR: [{ id: elevator.applicationId }, { elevatorId: elevator.id }],
          },
        },
        include: {
          actor: { select: { firstName: true, lastName: true } },
          application: { select: { applicationNumber: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.inspection.findMany({
        where: { elevatorId },
        include: { inspector: { select: { firstName: true, lastName: true } } },
        orderBy: { conductedDate: "desc" },
        take: limit,
      }),
      db.maintenanceRecord.findMany({
        where: { elevatorId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { performedDate: "desc" },
        take: limit,
      }),
      db.certificate.findMany({
        where: { elevatorId },
        orderBy: { issuedDate: "desc" },
        take: limit,
      }),
      db.auditLog.findMany({
        where: { entityType: "elevator", entityId: elevatorId },
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    const events: TimelineEvent[] = [];

    for (const s of statusHistory) {
      events.push({
        id: `status-${s.id}`,
        category: "status",
        title: `Status: ${s.fromStatus ?? "-"} → ${s.toStatus}`,
        description: s.reason ?? undefined,
        occurredAt: s.createdAt,
        actorName: legacyMigration
          ? LEGACY_REGISTRY_ATTRIBUTION
          : `${s.actor.firstName} ${s.actor.lastName}`,
      });
    }

    for (const o of ownershipHistory) {
      events.push({
        id: `ownership-${o.id}`,
        category: "ownership",
        title: `Ndryshim pronësie: ${o.oldOwner.name} → ${o.newOwner.name}`,
        description: o.reason ?? undefined,
        occurredAt: o.createdAt,
        actorName: legacyMigration
          ? LEGACY_REGISTRY_ATTRIBUTION
          : `${o.createdBy.firstName} ${o.createdBy.lastName}`,
      });
    }

    for (const w of workflowHistory) {
      events.push({
        id: `workflow-${w.id}`,
        category: "application",
        title: `${w.application.applicationNumber}: ${w.action}`,
        description: w.comment ?? `${w.fromStatus ?? ""} → ${w.toStatus}`,
        occurredAt: w.createdAt,
        actorName: displayLegacyActorName(w.actor, {
          applicationNumber: w.application.applicationNumber,
        }),
        metadata: { type: w.application.type },
      });
    }

    for (const i of inspections) {
      events.push({
        id: `inspection-${i.id}`,
        category: "inspection",
        title: `Inspektim ${i.type}: ${i.result}`,
        description: formatInspectionFindings(i.findings) ?? undefined,
        occurredAt: i.conductedDate ?? i.scheduledDate,
        actorName:
          isLegacyImportFindings(i.findings) ||
          i.findings?.trim().startsWith("K/INSP:") ||
          legacyMigration
            ? LEGACY_REGISTRY_ATTRIBUTION
            : `${i.inspector.firstName} ${i.inspector.lastName}`,
      });
    }

    for (const m of maintenanceRecords) {
      events.push({
        id: `maintenance-${m.id}`,
        category: "maintenance",
        title: m.interventionType ?? m.type,
        description: m.description ?? undefined,
        occurredAt: m.performedDate,
        actorName: `${m.createdBy.firstName} ${m.createdBy.lastName}`,
      });
    }

    for (const c of certificates) {
      events.push({
        id: `certificate-${c.id}`,
        category: "certificate",
        title: `Certifikatë ${c.certificateNumber} (${c.status})`,
        occurredAt: new Date(c.issuedDate),
      });
    }

    for (const a of auditLogs) {
      events.push({
        id: `audit-${a.id}`,
        category: "audit",
        title: `Audit: ${a.action}`,
        occurredAt: a.createdAt,
        actorName: a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : undefined,
      });
    }

    events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return events.slice(0, limit);
  }
}
