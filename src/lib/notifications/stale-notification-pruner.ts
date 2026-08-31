import {
  ApplicationStatus,
  DelegationStatus,
  DelegationType,
  NotificationStatus,
  ReturnTargetRole,
  type Notification,
} from "@prisma/client";
import { db } from "@/lib/db";
import { POST_CERTIFIER_WORK_STATUSES } from "@/lib/registration/phase-router";
import { getInstallerTechnicalReview } from "@/lib/registration/installer-technical-review";
import { getReturnToRoles } from "@/lib/workflows/return-targets";

const INSTALLER_ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_INSTALLER,
  ApplicationStatus.INSTALLER_INVITED,
  ApplicationStatus.INSTALLER_ACCEPTED,
  ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
];

const CERTIFIER_ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_CERTIFIER,
  ApplicationStatus.CERTIFIER_INVITED,
  ApplicationStatus.CERTIFIER_ACCEPTED,
  ApplicationStatus.CERTIFICATION_IN_PROGRESS,
];

type ApplicationSnapshot = {
  id: string;
  status: ApplicationStatus;
  returnToRole: ReturnTargetRole | null;
  returnToRoles: unknown;
  ownerOrgId: string;
  installerOrgId: string | null;
  certifierOrgId: string | null;
  registrationExtendedData: unknown;
  delegations: {
    accessType: DelegationType;
    status: DelegationStatus;
    organizationId: string;
  }[];
};

function titleIncludes(title: string, fragment: string): boolean {
  return title.toLowerCase().includes(fragment.toLowerCase());
}

function delegationFor(
  app: ApplicationSnapshot,
  accessType: DelegationType,
): ApplicationSnapshot["delegations"][number] | undefined {
  return app.delegations.find((row) => row.accessType === accessType);
}

function isInstallerTechnicalCorrectionRequest(title: string): boolean {
  return titleIncludes(title, "kërkohen korrigjime teknike");
}

function isInstallerTechnicalResubmitted(title: string): boolean {
  return titleIncludes(title, "instaluesi dërgoi korrigjime");
}

function isReturnNotification(title: string): boolean {
  if (isInstallerTechnicalCorrectionRequest(title) || isInstallerTechnicalResubmitted(title)) {
    return false;
  }

  return (
    titleIncludes(title, "u kthye") ||
    titleIncludes(title, "kërkohet korrigjim nga ju") ||
    title === "Aplikimi u kthye për korrigjim"
  );
}

function isInviteNotification(title: string, kind: "install" | "certifier"): boolean {
  if (kind === "install") {
    return titleIncludes(title, "ftesë për instalim") || titleIncludes(title, "ftese per instalim");
  }
  return titleIncludes(title, "ftesë për certifikim") || titleIncludes(title, "ftese per certifikim");
}

function isIshmtProgressNotification(title: string): boolean {
  return (
    titleIncludes(title, "u dërgua") ||
    titleIncludes(title, "u parashtrua") ||
    titleIncludes(title, "deleguar") ||
    titleIncludes(title, "raporti") ||
    titleIncludes(title, "vlerësimi") ||
    titleIncludes(title, "verifikim në terren") ||
    titleIncludes(title, "inspektor")
  );
}

export function isStaleApplicationNotification(
  notification: Pick<Notification, "title" | "body">,
  app: ApplicationSnapshot,
  userId?: string,
): boolean {
  const title = notification.title;
  const review = getInstallerTechnicalReview({
    registrationExtendedData: app.registrationExtendedData,
  });

  if (isInstallerTechnicalCorrectionRequest(title)) {
    return review.status !== "CORRECTIONS_REQUESTED";
  }

  if (isInstallerTechnicalResubmitted(title)) {
    return !(
      review.status === "PENDING_REVIEW" &&
      app.status === ApplicationStatus.CERTIFIER_ACCEPTED
    );
  }

  if (isInviteNotification(title, "install")) {
    const delegation = delegationFor(app, DelegationType.INSTALLER);
    if (!delegation) return true;
    if (delegation.status === DelegationStatus.ACCEPTED) return true;
    return !INSTALLER_ACTIVE_STATUSES.includes(app.status);
  }

  if (isInviteNotification(title, "certifier")) {
    const delegation = delegationFor(app, DelegationType.CERTIFIER);
    if (!delegation) return true;
    if (delegation.status === DelegationStatus.ACCEPTED) return true;
    return !CERTIFIER_ACTIVE_STATUSES.includes(app.status);
  }

  if (isReturnNotification(title)) {
    if (app.status !== ApplicationStatus.RETURNED) return true;

    if (titleIncludes(title, "kërkohet korrigjim nga ju")) {
      const targets = getReturnToRoles(app);
      if (userId) {
        // resolved below via membership when batch pruning
        return false;
      }
      return targets.length === 0;
    }

    if (titleIncludes(title, "u kthye për korrigjim") && !titleIncludes(title, "kërkohet")) {
      return false;
    }

    return false;
  }

  if (isIshmtProgressNotification(title)) {
    if (
      app.status === ApplicationStatus.APPROVED ||
      app.status === ApplicationStatus.REJECTED ||
      app.status === ApplicationStatus.CANCELLED ||
      app.status === ApplicationStatus.CLOSED
    ) {
      return true;
    }

    if (
      titleIncludes(title, "ftesë") ||
      titleIncludes(title, "pranoni") ||
      titleIncludes(title, "plotësoni")
    ) {
      return false;
    }

    if (
      POST_CERTIFIER_WORK_STATUSES.includes(app.status) &&
      (titleIncludes(title, "certifikim") || titleIncludes(title, "instalim"))
    ) {
      return true;
    }
  }

  return false;
}

async function loadApplicationSnapshots(ids: string[]): Promise<Map<string, ApplicationSnapshot>> {
  if (ids.length === 0) return new Map();

  const apps = await db.application.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      status: true,
      returnToRole: true,
      returnToRoles: true,
      ownerOrgId: true,
      installerOrgId: true,
      certifierOrgId: true,
      data: { select: { registrationExtendedData: true } },
      delegations: {
        select: { accessType: true, status: true, organizationId: true },
      },
    },
  });

  return new Map(
    apps.map((app) => [
      app.id,
      {
        id: app.id,
        status: app.status,
        returnToRole: app.returnToRole,
        returnToRoles: app.returnToRoles,
        ownerOrgId: app.ownerOrgId,
        installerOrgId: app.installerOrgId,
        certifierOrgId: app.certifierOrgId,
        registrationExtendedData: app.data?.registrationExtendedData ?? null,
        delegations: app.delegations,
      },
    ]),
  );
}

async function userCanActOnReturn(userId: string, app: ApplicationSnapshot): Promise<boolean> {
  const targets = getReturnToRoles(app);
  if (targets.length === 0) return false;

  const memberships = await db.orgMembership.findMany({
    where: { userId, deactivatedAt: null },
    select: { organizationId: true, role: { select: { code: true } } },
  });

  for (const target of targets) {
    if (target === ReturnTargetRole.OWNER) {
      if (memberships.some((m) => m.organizationId === app.ownerOrgId && m.role.code === "OWNER")) {
        return true;
      }
    }
    if (target === ReturnTargetRole.INSTALLER && app.installerOrgId) {
      if (memberships.some((m) => m.organizationId === app.installerOrgId)) return true;
    }
    if (target === ReturnTargetRole.CERTIFIER && app.certifierOrgId) {
      if (memberships.some((m) => m.organizationId === app.certifierOrgId)) return true;
    }
  }

  return false;
}

export async function isStaleNotification(
  notification: Notification,
  appSnapshots: Map<string, ApplicationSnapshot>,
): Promise<boolean> {
  if (notification.entityType === "compliance_alert" || notification.entityType === "ishmt_compliance_alert") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return notification.readAt != null || notification.createdAt < weekAgo;
  }

  if (notification.entityType === "ishmt_compliance_digest") {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return notification.createdAt < dayAgo;
  }

  if (notification.entityType !== "application" || !notification.entityId) {
    return false;
  }

  const app = appSnapshots.get(notification.entityId);
  if (!app) return true;

  if (app.status === ApplicationStatus.RETURNED && isReturnNotification(notification.title)) {
    const isInformationalReturn =
      notification.title.includes("u kthye për korrigjim") &&
      !notification.title.includes("kërkohet korrigjim");

    if (isInformationalReturn) {
      const canAct = await userCanActOnReturn(notification.userId, app);
      if (canAct) return true;
    }

    const isActionableTitle =
      notification.title.includes("kërkohet korrigjim nga ju") ||
      notification.title === "Aplikimi u kthye për korrigjim";

    if (isActionableTitle) {
      const canAct = await userCanActOnReturn(notification.userId, app);
      return !canAct;
    }
  }

  return isStaleApplicationNotification(notification, app, notification.userId);
}

export async function pruneStaleNotifications(options?: {
  userId?: string;
  includeRead?: boolean;
}): Promise<{ scanned: number; pruned: number }> {
  const rows = await db.notification.findMany({
    where: {
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.includeRead ? {} : { readAt: null }),
    },
    orderBy: { createdAt: "asc" },
  });

  const applicationIds = [
    ...new Set(
      rows
        .filter((row) => row.entityType === "application" && row.entityId)
        .map((row) => row.entityId as string),
    ),
  ];
  const appSnapshots = await loadApplicationSnapshots(applicationIds);

  const staleIds: string[] = [];
  for (const row of rows) {
    if (await isStaleNotification(row, appSnapshots)) {
      staleIds.push(row.id);
    }
  }

  if (staleIds.length === 0) {
    return { scanned: rows.length, pruned: 0 };
  }

  await db.notification.updateMany({
    where: { id: { in: staleIds } },
    data: { readAt: new Date(), status: NotificationStatus.READ },
  });

  return { scanned: rows.length, pruned: staleIds.length };
}

export async function filterActiveNotifications<T extends Notification>(notifications: T[]): Promise<T[]> {
  const applicationIds = [
    ...new Set(
      notifications
        .filter((row) => row.entityType === "application" && row.entityId)
        .map((row) => row.entityId as string),
    ),
  ];
  const appSnapshots = await loadApplicationSnapshots(applicationIds);

  const results: T[] = [];
  for (const row of notifications) {
    if (await isStaleNotification(row, appSnapshots)) {
      continue;
    }
    results.push(row);
  }

  return results;
}
