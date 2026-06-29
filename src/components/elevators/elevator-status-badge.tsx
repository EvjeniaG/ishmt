import { ElevatorStatus } from "@prisma/client";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import type { StatusTone } from "@/lib/registration/status-presentation";

const ELEVATOR_STATUS_TONE: Record<ElevatorStatus, StatusTone> = {
  PENDING_REGISTRATION: "waiting",
  PENDING_CONFIRMATION: "waiting",
  UNVERIFIED: "waiting",
  REGISTERED: "done",
  ACTIVE: "done",
  SUSPENDED: "danger",
  UNDER_INSPECTION: "action",
  EXPIRED_CERTIFICATION: "danger",
  MAINTENANCE_OVERDUE: "danger",
  OUT_OF_SERVICE: "neutral",
  DEREGISTERED: "neutral",
};

export function ElevatorStatusBadge({ status }: { status: ElevatorStatus }) {
  return (
    <WorkflowStatusChip
      label={labelElevatorStatus(status)}
      tone={ELEVATOR_STATUS_TONE[status] ?? "neutral"}
    />
  );
}
