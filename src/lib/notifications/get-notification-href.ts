export function getNotificationHref(
  entityType: string | null,
  entityId: string | null,
  notificationsHref: string,
): string | null {
  if (!entityType || !entityId) return null;

  const isIshmt = notificationsHref.startsWith("/ishmt");

  if (entityType === "application") {
    return isIshmt ? `/ishmt/review/${entityId}` : `/portal/applications/${entityId}`;
  }
  if (entityType === "elevator" || entityType === "compliance_alert") {
    return isIshmt ? `/ishmt/elevators/${entityId}` : `/portal/elevators/${entityId}`;
  }

  return null;
}
