import { ApplicationStatus, ApplicationType } from "@prisma/client";
import type { RoleCode } from "@/lib/constants/roles";
import {
  DELEGATION_REVOKED_STATUS_LABEL,
} from "@/lib/delegation/delegation-revoked";
import {
  getApplicationStatusDisplay,
  workflowStatusClass,
  type StatusTone,
} from "@/lib/registration/status-presentation";
import { cn } from "@/lib/utils";

export { getApplicationStatusLabel } from "@/lib/registration/status-presentation";

export function WorkflowStatusChip({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span className={cn(workflowStatusClass(tone), className)}>
      {label}
    </span>
  );
}

export function ApplicationStatusBadge({
  status,
  type,
  roleCode,
  delegationRevoked,
  className,
}: {
  status: ApplicationStatus;
  type?: ApplicationType;
  roleCode?: RoleCode;
  delegationRevoked?: boolean;
  className?: string;
}) {
  if (delegationRevoked) {
    return (
      <WorkflowStatusChip
        label={DELEGATION_REVOKED_STATUS_LABEL}
        tone="waiting"
        className={className}
      />
    );
  }

  const { label, tone } = getApplicationStatusDisplay(status, { type, roleCode });
  return <WorkflowStatusChip label={label} tone={tone} className={className} />;
}
