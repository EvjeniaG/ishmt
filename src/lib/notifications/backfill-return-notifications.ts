import { ApplicationStatus, ReturnTargetRole } from "@prisma/client";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";
import { getInstallerTechnicalReview } from "@/lib/registration/installer-technical-review";
import {
  getReturnToRoles,
  pickPrimaryReturnToRole,
  RETURN_TARGET_LABELS,
} from "@/lib/workflows/return-targets";

const LEGACY_RETURN_TITLE = "Aplikimi u kthye për korrigjim";

type ReturnedApplication = {
  id: string;
  applicationNumber: string;
  returnReason: string | null;
  requiredCorrection: string | null;
  returnToRoles: unknown;
  returnToRole: ReturnTargetRole | null;
  ownerOrgId: string;
  installerOrgId: string | null;
  certifierOrgId: string | null;
};

function notifyTargetsFor(app: ReturnedApplication) {
  return [
    { orgId: app.ownerOrgId, role: ReturnTargetRole.OWNER },
    app.installerOrgId
      ? { orgId: app.installerOrgId, role: ReturnTargetRole.INSTALLER }
      : null,
    app.certifierOrgId
      ? { orgId: app.certifierOrgId, role: ReturnTargetRole.CERTIFIER }
      : null,
  ].filter((t): t is { orgId: string; role: ReturnTargetRole } => t !== null);
}

async function userHasReturnNotification(
  userId: string,
  applicationId: string,
  mustAct: boolean,
): Promise<boolean> {
  if (mustAct) {
    const proper = await db.notification.findFirst({
      where: {
        userId,
        entityId: applicationId,
        entityType: "application",
        title: { contains: "kërkohet korrigjim nga ju" },
      },
    });
    return Boolean(proper);
  }

  const informational = await db.notification.findFirst({
    where: {
      userId,
      entityId: applicationId,
      entityType: "application",
      title: { contains: "u kthye për korrigjim" },
    },
  });
  return Boolean(informational);
}

export async function backfillReturnNotifications(options?: { dryRun?: boolean }) {
  const apps = await db.application.findMany({
    where: { status: ApplicationStatus.RETURNED, deletedAt: null },
    select: {
      id: true,
      applicationNumber: true,
      returnReason: true,
      requiredCorrection: true,
      returnToRoles: true,
      returnToRole: true,
      ownerOrgId: true,
      installerOrgId: true,
      certifierOrgId: true,
    },
  });

  let created = 0;
  let legacyMarkedRead = 0;

  for (const app of apps) {
    const returnToRoles = getReturnToRoles(app);
    if (returnToRoles.length === 0) continue;

    const primaryTarget = pickPrimaryReturnToRole(returnToRoles);
    const targetLabels = returnToRoles.map((role) => RETURN_TARGET_LABELS[role]).join(", ");
    const reason = app.returnReason ?? "Pa arsye të specifikuar.";
    const correction = app.requiredCorrection ?? "Pa detaje.";

    for (const target of notifyTargetsFor(app)) {
      const mustAct = returnToRoles.includes(target.role);
      const memberships = await db.orgMembership.findMany({
        where: { organizationId: target.orgId, deactivatedAt: null },
        select: { userId: true },
      });

      for (const membership of memberships) {
        const hasNotification = await userHasReturnNotification(
          membership.userId,
          app.id,
          mustAct,
        );
        if (hasNotification) continue;

        const title = mustAct
          ? `${app.applicationNumber}: kërkohet korrigjim nga ju`
          : `${app.applicationNumber}: u kthye për korrigjim`;
        const body = mustAct
          ? `${reason}\n\nKorrigjimi i kërkuar: ${correction}`
          : `IQMT e ktheu aplikimin te ${targetLabels} (${RETURN_TARGET_LABELS[primaryTarget]}). Arsyeja: ${reason}`;

        if (options?.dryRun) {
          console.log(`[dry-run] Would notify user ${membership.userId}: ${title}`);
          created += 1;
          continue;
        }

        await NotificationService.create({
          userId: membership.userId,
          title,
          body,
          entityType: "application",
          entityId: app.id,
        });
        created += 1;

        if (mustAct) {
          const legacy = await db.notification.updateMany({
            where: {
              userId: membership.userId,
              entityId: app.id,
              entityType: "application",
              title: LEGACY_RETURN_TITLE,
              readAt: null,
            },
            data: { readAt: new Date() },
          });
          legacyMarkedRead += legacy.count;

          await db.notification.updateMany({
            where: {
              userId: membership.userId,
              entityId: app.id,
              entityType: "application",
              title: { contains: "u kthye për korrigjim" },
              NOT: { title: { contains: "kërkohet korrigjim" } },
            },
            data: { readAt: new Date() },
          });
        } else if (!options?.dryRun) {
          await db.notification.updateMany({
            where: {
              userId: membership.userId,
              entityId: app.id,
              entityType: "application",
              title: { contains: "kërkohet korrigjim nga ju" },
            },
            data: { readAt: new Date() },
          });
        }
      }
    }
  }

  return { applications: apps.length, created, legacyMarkedRead };
}

/** Rikrijon njoftimet e korrigjimit teknik instalues–certifikues që u fshinë gabimisht. */
export async function backfillInstallerTechnicalCorrectionNotifications(options?: { dryRun?: boolean }) {
  const apps = await db.application.findMany({
    where: {
      deletedAt: null,
      installerOrgId: { not: null },
      status: ApplicationStatus.CERTIFIER_ACCEPTED,
    },
    select: {
      id: true,
      applicationNumber: true,
      installerOrgId: true,
      data: { select: { registrationExtendedData: true } },
    },
  });

  let created = 0;

  for (const app of apps) {
    const review = getInstallerTechnicalReview(app.data);
    if (review.status !== "CORRECTIONS_REQUESTED" || !app.installerOrgId) continue;

    const memberships = await db.orgMembership.findMany({
      where: { organizationId: app.installerOrgId, deactivatedAt: null },
      select: { userId: true },
    });

    for (const membership of memberships) {
      const existingUnread = await db.notification.findFirst({
        where: {
          userId: membership.userId,
          entityId: app.id,
          entityType: "application",
          title: { contains: "Kërkohen korrigjime teknike" },
          readAt: null,
        },
      });
      if (existingUnread) continue;

      const body = review.certifierNotes
        ? `Certifikuesi kërkon korrigjime për ${app.applicationNumber}.\n\n${review.certifierNotes}`
        : `Certifikuesi kërkon korrigjime për ${app.applicationNumber}.`;

      if (options?.dryRun) {
        console.log(`[dry-run] Would notify installer user ${membership.userId} for ${app.applicationNumber}`);
        created += 1;
        continue;
      }

      await NotificationService.create({
        userId: membership.userId,
        title: "Kërkohen korrigjime teknike",
        body,
        entityType: "application",
        entityId: app.id,
      });
      created += 1;
    }
  }

  return { created };
}
