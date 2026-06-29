import { MaintenanceContractStatus } from "@prisma/client";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
} from "@/lib/services/maintenance-contract-service";
import type { StatusTone } from "@/lib/registration/status-presentation";

const CONTRACT_TONE_MAP: Record<"warning" | "success" | "danger" | "muted", StatusTone> = {
  warning: "waiting",
  success: "done",
  danger: "danger",
  muted: "neutral",
};

export function ContractStatusBadge({ status }: { status: MaintenanceContractStatus }) {
  const tone = CONTRACT_TONE_MAP[CONTRACT_STATUS_TONE[status]] ?? "neutral";
  return <WorkflowStatusChip label={CONTRACT_STATUS_LABELS[status]} tone={tone} />;
}
