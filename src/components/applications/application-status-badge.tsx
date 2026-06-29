import { ApplicationStatus, ApplicationType } from "@prisma/client";
import type { RoleCode } from "@/lib/constants/roles";
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
  className,
}: {
  status: ApplicationStatus;
  type?: ApplicationType;
  roleCode?: RoleCode;
  className?: string;
}) {
  const { label, tone } = getApplicationStatusDisplay(status, { type, roleCode });
  return <WorkflowStatusChip label={label} tone={tone} className={className} />;
}
