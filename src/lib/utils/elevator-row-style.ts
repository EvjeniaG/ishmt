import { ElevatorStatus } from "@prisma/client";

/** Row background colors per WF3 lifecycle states */
export function elevatorRowClassName(status: ElevatorStatus | string): string {
  switch (status) {
    case ElevatorStatus.DEREGISTERED:
      return "bg-[#FFF5F5]";
    case "CORRECTED":
      return "bg-[#FFFDE7]";
    case "UPDATED":
      return "bg-[#E3F2FD]";
    default:
      return "";
  }
}
