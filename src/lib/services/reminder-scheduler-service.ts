import { NotificationChannel, ReminderEntityType } from "@prisma/client";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";

const DEFAULT_DAYS_BEFORE = 30;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Motor alarmesh 30-ditore (Foto 2) - thirret nga cron ose manualisht */
export class ReminderSchedulerService {
  static async runDueReminders(now = new Date()) {
    const due = await db.scheduledReminder.findMany({
      where: { scheduledFor: { lte: now }, sentAt: null },
      include: { user: true, elevator: true },
      take: 200,
    });

    let sent = 0;
    for (const reminder of due) {
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

    const scheduledFor = addDays(contract.endDate, -DEFAULT_DAYS_BEFORE);
    if (scheduledFor < now) return { created: 0 };

    let created = 0;
    for (const m of contract.elevator.ownerOrg.memberships) {
      const exists = await db.scheduledReminder.findFirst({
        where: {
          entityType: ReminderEntityType.MAINTENANCE_CONTRACT,
          entityId: contract.id,
          userId: m.userId,
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
          daysBefore: DEFAULT_DAYS_BEFORE,
          targetDate: contract.endDate,
          scheduledFor,
        },
      });
      created += 1;
    }

    return { created };
  }

  /** Planifikon alarme 30 ditë para skadimit të kontratave dhe inspektimeve */
  static async scheduleUpcomingDeadlines(now = new Date()) {
    const targetHorizon = addDays(now, DEFAULT_DAYS_BEFORE + 1);
    let created = 0;

    const contracts = await db.maintenanceContract.findMany({
      where: {
        isActive: true,
        endDate: { lte: targetHorizon, gte: now },
      },
      include: {
        elevator: { include: { ownerOrg: { include: { memberships: { where: { deactivatedAt: null } } } } } },
      },
    });

    for (const contract of contracts) {
      if (!contract.endDate) continue;
      const scheduledFor = addDays(contract.endDate, -DEFAULT_DAYS_BEFORE);
      if (scheduledFor < now) continue;

      for (const m of contract.elevator.ownerOrg.memberships) {
        const exists = await db.scheduledReminder.findFirst({
          where: {
            entityType: ReminderEntityType.MAINTENANCE_CONTRACT,
            entityId: contract.id,
            userId: m.userId,
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
            daysBefore: DEFAULT_DAYS_BEFORE,
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
        ownerOrg: { include: { memberships: { where: { deactivatedAt: null } } } },
        maintenanceOrg: { include: { memberships: { where: { deactivatedAt: null } } } },
      },
    });

    for (const elv of elevators) {
      const nextDue = elv.inspections[0]?.nextInspectionDate;
      if (!nextDue || nextDue > targetHorizon) continue;

      const scheduledFor = addDays(nextDue, -DEFAULT_DAYS_BEFORE);
      if (scheduledFor < now) continue;

      const notifyUsers = [
        ...elv.ownerOrg.memberships.map((m) => m.userId),
        ...(elv.maintenanceOrg?.memberships.map((m) => m.userId) ?? []),
      ];

      for (const userId of [...new Set(notifyUsers)]) {
        const exists = await db.scheduledReminder.findFirst({
          where: {
            entityType: ReminderEntityType.INSPECTION,
            entityId: elv.id,
            userId,
            sentAt: null,
          },
        });
        if (exists) continue;

        await db.scheduledReminder.create({
          data: {
            entityType: ReminderEntityType.INSPECTION,
            entityId: elv.id,
            elevatorId: elv.id,
            userId,
            channel: NotificationChannel.IN_APP,
            daysBefore: DEFAULT_DAYS_BEFORE,
            targetDate: nextDue,
            scheduledFor,
          },
        });
        created += 1;
      }
    }

    return { created, daysBefore: DEFAULT_DAYS_BEFORE };
  }
}
