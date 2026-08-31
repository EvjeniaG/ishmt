import { OrgStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";

const STATUS_VARIANT: Partial<Record<OrgStatus, string>> = {
  [OrgStatus.ACTIVE_AUTHORIZED]: "portal-badge-success",
  [OrgStatus.ACTIVE]: "portal-badge-success",
  [OrgStatus.PENDING_VALIDATION]: "portal-badge-info",
  [OrgStatus.SUSPENDED]: "portal-badge-warning",
  [OrgStatus.REVOKED]: "portal-badge-danger",
  [OrgStatus.REJECTED]: "portal-badge-danger",
  [OrgStatus.EXPIRED]: "portal-badge-warning",
  [OrgStatus.INACTIVE]: "portal-badge-neutral",
};

export function OrgStatusBadge({ status }: { status: OrgStatus }) {
  return (
    <span className={cn(STATUS_VARIANT[status] ?? "portal-badge-neutral")}>
      {ORG_STATUS_LABELS[status] ?? status}
    </span>
  );
}
