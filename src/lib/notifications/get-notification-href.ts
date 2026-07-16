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
  if (entityType === "citizen_report") {
    return isIshmt ? `/ishmt/reports/${entityId}` : null;
  }
  if (entityType === "field_inspection_assignment") {
    return isIshmt ? "/ishmt/my-field-inspections" : null;
  }
  if (entityType === "elevator" || entityType === "compliance_alert" || entityType === "ishmt_compliance_alert") {
    return isIshmt ? `/ishmt/elevators/${entityId}` : `/portal/elevators/${entityId}`;
  }

  return null;
}
