import type { Prisma } from "@prisma/client";
import { isLegacyMigrationApplicationNumber } from "@/lib/migration/legacy-display";

function parseEnvFlag(value: string | undefined): boolean | null {
  const flag = value?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return null;
}

/** Butonat «Plotëso me të dhëna demo» - aktiv në dev ose me ISHMT_DEMO_TOOLS=true. */
export function isDemoToolsEnabled(): boolean {
  const explicit =
    parseEnvFlag(process.env.ISHMT_DEMO_TOOLS) ??
    parseEnvFlag(process.env.NEXT_PUBLIC_ISHMT_DEMO_TOOLS);
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV !== "production";
}

export function isRegisterDemoEnabled(): boolean {
  return isDemoToolsEnabled();
}

/** Vetëm të dhëna demo (pa regjistër legacy / migrim Excel). */
export function isDemoDataMode(): boolean {
  const flag = process.env.ISHMT_DEMO_DATA?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return process.env.NODE_ENV !== "production";
}

/** Import legacy / ashensorë PENDING_CONFIRMATION nga migrimi. */
export function isLegacyMigrationEnabled(): boolean {
  return !isDemoDataMode();
}

/** Ashensorë të importuar nga Excel (aplikim MIG-*). */
export function demoDataElevatorWhere(): Prisma.ElevatorWhereInput {
  return {
    NOT: {
      originatingApplication: {
        applicationNumber: { startsWith: "MIG-" },
      },
    },
  };
}

/** Aplikime të krijuara nga migrimi legacy. */
export function demoDataApplicationWhere(): Prisma.ApplicationWhereInput {
  return {
    NOT: {
      applicationNumber: { startsWith: "MIG-" },
    },
  };
}

export function withDemoDataElevatorScope(
  where: Prisma.ElevatorWhereInput = {},
): Prisma.ElevatorWhereInput {
  if (!isDemoDataMode()) return where;
  return { AND: [where, demoDataElevatorWhere()] };
}

export function withDemoDataApplicationScope(
  where: Prisma.ApplicationWhereInput = {},
): Prisma.ApplicationWhereInput {
  if (!isDemoDataMode()) return where;
  return { AND: [where, demoDataApplicationWhere()] };
}

export function elevatorMatchesDemoDataMode(
  applicationNumber: string | null | undefined,
): boolean {
  if (!isDemoDataMode()) return true;
  return !isLegacyMigrationApplicationNumber(applicationNumber);
}
