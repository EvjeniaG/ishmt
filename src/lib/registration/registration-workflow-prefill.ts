import {
  ApplicationStatus,
  ApplicationType,
  ElevatorStatus,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";

/** VKM 1056: ashensor i ri = i instaluar/vënë në shërbim nga 01.01.2020. */
export const NEW_ELEVATOR_CUTOFF = new Date("2020-01-01T00:00:00.000Z");

export type ElevatorConditionType = "NEW" | "EXISTING";
export type ApplicationSubtype = "FIRST" | "ADDITIONAL";

export type RegistrationWorkflowPrefill = {
  elevatorConditionType: ElevatorConditionType;
  applicationSubtype: ApplicationSubtype;
  existingRegisteredElevatorsCount?: number;
};

/** Statuset që numërohen si ashensorë tashmë të r. */
const REGISTERED_ELEVATOR_STATUSES: ElevatorStatus[] = [
  ElevatorStatus.ACTIVE,
  ElevatorStatus.REGISTERED,
  ElevatorStatus.SUSPENDED,
  ElevatorStatus.UNDER_INSPECTION,
  ElevatorStatus.EXPIRED_CERTIFICATION,
  ElevatorStatus.MAINTENANCE_OVERDUE,
  ElevatorStatus.OUT_OF_SERVICE,
  ElevatorStatus.UNVERIFIED,
  ElevatorStatus.PENDING_CONFIRMATION,
];

const COMPLETED_REGISTRATION_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.ELEVATOR_CREATED,
  ApplicationStatus.ASSETS_GENERATED,
  ApplicationStatus.CLOSED,
];

function parseElevatorConditionType(value: unknown): ElevatorConditionType | undefined {
  if (value === "NEW" || value === "EXISTING") return value;
  return undefined;
}

/**
 * Llogarit tipologjinë e aplikimit nga numri i ashensorëve në regjistër.
 * - 0 ashensorë → aplikim i parë
 * - ≥1 ashensorë → aplikim shtesë + numri i regjistruar më parë
 */
export function buildRegistrationWorkflowPrefillFromCount(
  registeredCount: number,
  lastConditionType?: ElevatorConditionType,
): RegistrationWorkflowPrefill {
  if (registeredCount <= 0) {
    return {
      elevatorConditionType: "EXISTING",
      applicationSubtype: "FIRST",
    };
  }

  return {
    elevatorConditionType: lastConditionType ?? "EXISTING",
    applicationSubtype: "ADDITIONAL",
    existingRegisteredElevatorsCount: registeredCount,
  };
}

export function registrationWorkflowPrefillToExtendedData(
  workflow: RegistrationWorkflowPrefill,
): Record<string, string> {
  const data: Record<string, string> = {
    elevatorConditionType: workflow.elevatorConditionType,
    applicationSubtype: workflow.applicationSubtype,
  };
  if (workflow.existingRegisteredElevatorsCount != null) {
    data.existingRegisteredElevatorsCount = String(workflow.existingRegisteredElevatorsCount);
  }
  return data;
}

export async function loadRegistrationWorkflowPrefill(
  orgId: string,
  options?: { excludeApplicationId?: string },
): Promise<RegistrationWorkflowPrefill> {
  const elevatorWhere: Prisma.ElevatorWhereInput = {
    ownerOrgId: orgId,
    deletedAt: null,
    status: { in: REGISTERED_ELEVATOR_STATUSES },
  };

  if (options?.excludeApplicationId) {
    elevatorWhere.applicationId = { not: options.excludeApplicationId };
  }

  const [registeredCount, lastCompletedRegistration] = await Promise.all([
    db.elevator.count({ where: elevatorWhere }),
    db.application.findFirst({
      where: {
        ownerOrgId: orgId,
        deletedAt: null,
        type: ApplicationType.NEW_REGISTRATION,
        status: { in: COMPLETED_REGISTRATION_STATUSES },
        ...(options?.excludeApplicationId ? { id: { not: options.excludeApplicationId } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { data: true },
    }),
  ]);

  const lastExt = lastCompletedRegistration?.data?.registrationExtendedData as
    | Record<string, unknown>
    | null
    | undefined;
  const lastConditionType = parseElevatorConditionType(lastExt?.elevatorConditionType);

  return buildRegistrationWorkflowPrefillFromCount(registeredCount, lastConditionType);
}

/** Përcakton I RI / EKZISTUES sipas datës së instalimit/vënies në shërbim (VKM 1056). */
export function inferElevatorConditionFromInServiceDate(
  dateInput: string | Date,
): ElevatorConditionType | null {
  const date = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
  if (Number.isNaN(date.getTime())) return null;
  return date >= NEW_ELEVATOR_CUTOFF ? "NEW" : "EXISTING";
}
