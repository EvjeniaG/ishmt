import { MaintenanceContractStatus, NotificationChannel, ReminderEntityType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  PERIODIC_INSPECTION_ALARM_DAYS_BEFORE,
  PERIODIC_INSPECTION_LOG_WINDOW_DAYS,
  PERIODIC_INSPECTION_REMINDER_OFFSETS,
  resolvePeriodicInspectionNextDue,
} from "@/lib/elevators/periodic-inspection-window";
import { NotificationService } from "@/lib/services/notification-service";
import { OperationalEventNotificationService } from "@/lib/services/operational-event-notification-service";

const MAINTENANCE_CONTRACT_REMINDER_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function inspectionReminderCopy(input: {
  registryNumber: string;
  targetDate: Date;
  daysBefore: number;
}) {
  const dueLabel = input.targetDate.toLocaleDateString("sq-AL");
  if (input.daysBefore <= PERIODIC_INSPECTION_ALARM_DAYS_BEFORE) {
    return {
      title: "Alarm inspektimi periodik",
      body: `Inspektimi periodik për ashensorin ${input.registryNumber} duhet kryer brenda ${input.daysBefore} ditëve (afati: ${dueLabel}).`,
    };
  }
  return {
    title: "Hapet regjistrimi i inspektimit periodik",
    body: `Regjistrimi i inspektimit periodik për ashensorin ${input.registryNumber} hapet sot. Afati: ${dueLabel}.`,
  };
}

/** Motor alarmesh — thirret nga cron ose manualisht */
export class ReminderSchedulerService {
  static async runDueReminders(now = new Date()) {
    const due = await db.scheduledReminder.findMany({
      where: { scheduledFor: { lte: now }, sentAt: null },
      include: { user: true, elevator: true },
      take: 200,
    });

    const broadcastInspectionKeys = new Set<string>();
    let sent = 0;

    for (const reminder of due) {
      if (reminder.entityType === ReminderEntityType.INSPECTION && reminder.elevator) {
        const broadcastKey = `${reminder.entityId}:${reminder.targetDate.toISOString()}:${reminder.daysBefore}`;
        if (!broadcastInspectionKeys.has(broadcastKey)) {
          broadcastInspectionKeys.add(broadcastKey);
          const inspectionContract = await db.maintenanceContract.findFirst({
            where: {
              elevatorId: reminder.entityId,
              serviceType: "PERIODIC_INSPECTION",
              isActive: true,
              status: MaintenanceContractStatus.ACTIVE,
            },
            select: { maintenanceOrgId: true },
          });

          const copy = inspectionReminderCopy({
            registryNumber: reminder.elevator.registryNumber ?? reminder.entityId,
            targetDate: new Date(reminder.targetDate),
            daysBefore: reminder.daysBefore,
          });

          await OperationalEventNotificationService.broadcastForElevator({
            elevatorId: reminder.entityId,
            title: copy.title,
            body: copy.body,
            entityType: "elevator",
            entityId: reminder.entityId,
            targets: { owner: true, maintenance: true, certifier: true, ishmt: true },
            extraOrgIds: inspectionContract?.maintenanceOrgId
              ? [inspectionContract.maintenanceOrgId]
              : undefined,
          });
        }

        await db.scheduledReminder.update({
          where: { id: reminder.id },
          data: { sentAt: now },
        });
        sent += 1;
        continue;
      }

      await NotificationService.create({
        userId: reminder.userId,
        title: "Alarm afati",
        body: `Afati për ${reminder.entityType} skadon më ${new Date(reminder.targetDate).toLocaleDateString("sq-AL")}.`,
        entityType: reminder.entityType,
        entityId: reminder.entityId,
      });
      await db.scheduledReminder.update({
        where: { id: reminder.id },
        data: { sentAt: now },
      });
      sent += 1;
    }

    return { processed: due.length, sent };
  }

  static async scheduleForContract(contractId: string, now = new Date()) {
    const contract = await db.maintenanceContract.findUnique({
      where: { id: contractId },
      include: {
        elevator: { include: { ownerOrg: { include: { memberships: { where: { deactivatedAt: null } } } } } },
      },
    });
    if (!contract?.endDate || !contract.isActive) return { created: 0 };

    const scheduledFor = addDays(contract.endDate, -MAINTENANCE_CONTRACT_REMINDER_DAYS);
    if (scheduledFor < now) return { created: 0 };

    let created = 0;
    for (const m of contract.elevator.ownerOrg.memberships) {
      const exists = await db.scheduledReminder.findFirst({
        where: {
          entityType: ReminderEntityType.MAINTENANCE_CONTRACT,
          entityId: contract.id,
          userId: m.userId,
          daysBefore: MAINTENANCE_CONTRACT_REMINDER_DAYS,
          sentAt: null,
        },
      });
      if (exists) continue;

      await db.scheduledReminder.create({
        data: {
          entityType: ReminderEntityType.MAINTENANCE_CONTRACT,
          entityId: contract.id,
          elevatorId: contract.elevatorId,
          userId: m.userId,
          channel: NotificationChannel.IN_APP,
          daysBefore: MAINTENANCE_CONTRACT_REMINDER_DAYS,
          targetDate: contract.endDate,
          scheduledFor,
        },
      });
      created += 1;
    }

    return { created };
  }

  /** Planifikon alarme për inspektimin periodik OM (30 dhe 7 ditë para afatit). */
  static async schedulePeriodicInspectionReminders(
    elevatorId: string,
    nextDue: Date,
    now = new Date(),
  ): Promise<{ created: number }> {
    const elv = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      include: {
        ownerOrg: { include: { memberships: { where: { deactivatedAt: null } } } },
        maintenanceContracts: {
          where: {
            serviceType: "PERIODIC_INSPECTION",
            isActive: true,
            status: MaintenanceContractStatus.ACTIVE,
          },
          include: {
            maintenanceOrg: { include: { memberships: { where: { deactivatedAt: null } } } },
          },
          take: 1,
        },
      },
    });
    if (!elv) return { created: 0 };

    const inspectionOrg = elv.maintenanceContracts[0]?.maintenanceOrg ?? null;
    const notifyUsers = [
      ...elv.ownerOrg.memberships.map((m) => m.userId),
      ...(inspectionOrg?.memberships.map((m) => m.userId) ?? []),
    ];

    let created = 0;
    for (const daysBefore of PERIODIC_INSPECTION_REMINDER_OFFSETS) {
      const scheduledFor = addDays(nextDue, -daysBefore);
      if (scheduledFor < now) continue;

      for (const userId of [...new Set(notifyUsers)]) {
        const exists = await db.scheduledReminder.findFirst({
          where: {
            entityType: ReminderEntityType.INSPECTION,
            entityId: elevatorId,
            userId,
            targetDate: nextDue,
            daysBefore,
          },
        });
        if (exists) continue;

        await db.scheduledReminder.create({
          data: {
            entityType: ReminderEntityType.INSPECTION,
            entityId: elevatorId,
            elevatorId,
            userId,
            channel: NotificationChannel.IN_APP,
            daysBefore,
            targetDate: nextDue,
            scheduledFor,
          },
        });
        created += 1;
      }
    }

    return { created };
  }

  /** Planifikon alarme para skadimit të kontratave dhe inspektimeve periodike. */
  static async scheduleUpcomingDeadlines(now = new Date()) {
    const inspectionHorizon = addDays(
      now,
      Math.max(PERIODIC_INSPECTION_LOG_WINDOW_DAYS, PERIODIC_INSPECTION_ALARM_DAYS_BEFORE) + 1,
    );
    let created = 0;

    const contracts = await db.maintenanceContract.findMany({
      where: {
        isActive: true,
        endDate: { lte: addDays(now, MAINTENANCE_CONTRACT_REMINDER_DAYS + 1), gte: now },
      },
      include: {
        elevator: { include: { ownerOrg: { include: { memberships: { where: { deactivatedAt: null } } } } } },
      },
    });

    for (const contract of contracts) {
      if (!contract.endDate) continue;
      const scheduledFor = addDays(contract.endDate, -MAINTENANCE_CONTRACT_REMINDER_DAYS);
      if (scheduledFor < now) continue;

      for (const m of contract.elevator.ownerOrg.memberships) {
        const exists = await db.scheduledReminder.findFirst({
          where: {
            entityType: ReminderEntityType.MAINTENANCE_CONTRACT,
            entityId: contract.id,
            userId: m.userId,
            daysBefore: MAINTENANCE_CONTRACT_REMINDER_DAYS,
            sentAt: null,
          },
        });
        if (exists) continue;

        await db.scheduledReminder.create({
          data: {
            entityType: ReminderEntityType.MAINTENANCE_CONTRACT,
            entityId: contract.id,
            elevatorId: contract.elevatorId,
            userId: m.userId,
            channel: NotificationChannel.IN_APP,
            daysBefore: MAINTENANCE_CONTRACT_REMINDER_DAYS,
            targetDate: contract.endDate,
            scheduledFor,
          },
        });
        created += 1;
      }
    }

    const elevators = await db.elevator.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        inspections: { where: { type: "PERIODIC" }, orderBy: { conductedDate: "desc" }, take: 1 },
        originatingApplication: { include: { data: true } },
      },
    });

    for (const elv of elevators) {
      const lastInspection = elv.inspections[0] ?? null;
      const buildingType = elv.originatingApplication?.data?.buildingType ?? null;
      const intervalMonths =
        buildingType === "WORKPLACE" || buildingType === "PUBLIC_BUILDING" ? 6 : 12;

      const nextDue = resolvePeriodicInspectionNextDue({
        lastInspection: lastInspection
          ? {
              conductedDate: lastInspection.conductedDate,
              result: lastInspection.result,
              nextInspectionDate: lastInspection.nextInspectionDate,
            }
          : null,
        registrationDate: elv.registrationDate,
        intervalMonths,
      });

      if (!nextDue || nextDue > inspectionHorizon) continue;

      const result = await this.schedulePeriodicInspectionReminders(elv.id, nextDue, now);
      created += result.created;
    }

    return {
      created,
      inspectionReminderDays: [...PERIODIC_INSPECTION_REMINDER_OFFSETS],
    };
  }
}
