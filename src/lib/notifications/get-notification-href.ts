export type NotificationHrefContext = {
  title?: string | null;
  body?: string | null;
};

function normalizeEntityType(entityType: string | null | undefined): string | null {
  if (!entityType) return null;
  return entityType.trim().toLowerCase();
}

function portalComplianceAlertHref(entityId: string, title?: string | null): string {
  const t = (title ?? "").toLowerCase();
  if (t.includes("qr") || t.includes("fotografi")) {
    return `/portal/elevators/${entityId}?tab=qr`;
  }
  if (
    t.includes("mirëmbajt") ||
    t.includes("mirembajt") ||
    t.includes("mirëmbajtje") ||
    t.includes("mirembajtje")
  ) {
    return "/portal/maintenance";
  }
  if (
    t.includes("inspekt") ||
    t.includes("kontroll periodik") ||
    t.includes("inspektim periodik") ||
    t.includes(" om") ||
    t.startsWith("om ")
  ) {
    return "/portal/kontroll-periodik";
  }
  return `/portal/elevators/${entityId}`;
}

function portalContractHref(serviceType?: string | null): string {
  if (serviceType === "PERIODIC_INSPECTION") {
    return "/portal/omi/kontratat-kontrolli";
  }
  return "/portal/sherbimi/contracts";
}

export function getNotificationHref(
  entityType: string | null,
  entityId: string | null,
  notificationsHref: string,
  context?: NotificationHrefContext,
): string | null {
  if (!entityType || !entityId) return null;

  const type = normalizeEntityType(entityType);
  const isIshmt = notificationsHref.startsWith("/ishmt");

  if (type === "application") {
    return isIshmt ? `/ishmt/review/${entityId}` : `/portal/applications/${entityId}`;
  }
  if (type === "field_review_assignment") {
    return isIshmt ? `/ishmt/review/${entityId}` : null;
  }
  if (type === "citizen_report") {
    return isIshmt ? `/ishmt/reports/${entityId}` : null;
  }
  if (type === "field_inspection_assignment") {
    return isIshmt ? "/ishmt/my-field-inspections" : null;
  }
  if (type === "elevator") {
    return isIshmt ? `/ishmt/elevators/${entityId}` : `/portal/elevators/${entityId}`;
  }
  if (type === "compliance_alert" || type === "ishmt_compliance_alert") {
    return isIshmt
      ? `/ishmt/elevators/${entityId}`
      : portalComplianceAlertHref(entityId, context?.title);
  }
  if (type === "ishmt_compliance_digest") {
    return isIshmt ? "/ishmt/compliance-digest" : null;
  }
  if (type === "maintenance_record" || type === "maintenance_monthly_report") {
    return isIshmt ? null : "/portal/sherbimi/nderhyrje";
  }
  if (type === "maintenance_assignment") {
    return isIshmt ? null : "/portal/maintenance";
  }
  if (type === "org_invitation") {
    return "/auth/accept-invitation";
  }
  if (type === "qkb_validation") {
    return isIshmt ? "/ishmt/admin/qkb-validation" : "/portal/settings/organization/qkb";
  }

  return null;
}

/** Href kur entityId referon një kontratë mirëmbajtjeje / inspektimi. */
export function getNotificationHrefForContract(
  entityId: string,
  notificationsHref: string,
  serviceType?: string | null,
): string {
  const isIshmt = notificationsHref.startsWith("/ishmt");
  if (isIshmt) {
    return `/ishmt/compliance`;
  }
  return portalContractHref(serviceType);
}

/** Href kur entityId referon një ashensor (p.sh. nga kontratë ose inspektim). */
export function getNotificationHrefForElevator(
  elevatorId: string,
  notificationsHref: string,
): string {
  const isIshmt = notificationsHref.startsWith("/ishmt");
  return isIshmt ? `/ishmt/elevators/${elevatorId}` : `/portal/elevators/${elevatorId}`;
}

const EXACT_PATH_HREFS = new Set(["/ishmt/my-field-inspections", "/ishmt/compliance-digest"]);

/** True when the current route is the notification target (or a sub-route of it). */
export function pathMatchesNotificationHref(href: string, pathname: string): boolean {
  const hrefPath = href.split("?")[0].replace(/\/$/, "") || "/";
  const currentPath = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (EXACT_PATH_HREFS.has(hrefPath)) {
    return currentPath === hrefPath;
  }

  return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
}

export function notificationsBaseHrefForPath(pathname: string): string {
  return pathname.startsWith("/ishmt") || pathname.startsWith("/directorate")
    ? "/ishmt/notifications"
    : "/portal/notifications";
}

export function serializeNotificationForClient(notification: {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
}) {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
    entityType: notification.entityType,
    entityId: notification.entityId,
  };
}
