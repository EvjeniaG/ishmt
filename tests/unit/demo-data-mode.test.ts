import { afterEach, describe, expect, it, vi } from "vitest";
import {
  elevatorMatchesDemoDataMode,
  isDemoDataMode,
  isDemoToolsEnabled,
  isLegacyMigrationEnabled,
  isRegisterDemoEnabled,
  withDemoDataApplicationScope,
  withDemoDataElevatorScope,
} from "@/lib/demo/demo-data-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDemoDataMode", () => {
  it("is enabled explicitly with ISHMT_DEMO_DATA=true", () => {
    vi.stubEnv("ISHMT_DEMO_DATA", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoDataMode()).toBe(true);
    expect(isLegacyMigrationEnabled()).toBe(false);
  });

  it("is disabled explicitly with ISHMT_DEMO_DATA=false", () => {
    vi.stubEnv("ISHMT_DEMO_DATA", "false");
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoDataMode()).toBe(false);
    expect(isLegacyMigrationEnabled()).toBe(true);
  });

  it("defaults to demo mode outside production when unset", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoDataMode()).toBe(true);
  });
});

describe("isDemoToolsEnabled", () => {
  it("is enabled in production when ISHMT_DEMO_TOOLS=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ISHMT_DEMO_TOOLS", "true");
    expect(isDemoToolsEnabled()).toBe(true);
    expect(isRegisterDemoEnabled()).toBe(true);
  });

  it("is disabled in production when ISHMT_DEMO_TOOLS=false", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ISHMT_DEMO_TOOLS", "false");
    expect(isDemoToolsEnabled()).toBe(false);
  });

  it("defaults to enabled outside production when unset", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoToolsEnabled()).toBe(true);
  });
});

describe("demo data scopes", () => {
  it("passes through elevator where when demo mode is off", () => {
    vi.stubEnv("ISHMT_DEMO_DATA", "false");
    const where = { deletedAt: null, status: "ACTIVE" as const };
    expect(withDemoDataElevatorScope(where)).toEqual(where);
  });

  it("wraps elevator where with legacy exclusion in demo mode", () => {
    vi.stubEnv("ISHMT_DEMO_DATA", "true");
    const scoped = withDemoDataElevatorScope({ deletedAt: null });
    expect(scoped).toEqual({
      AND: [
        { deletedAt: null },
        {
          NOT: {
            originatingApplication: {
              applicationNumber: { startsWith: "MIG-" },
            },
          },
        },
      ],
    });
  });

  it("wraps application where with MIG exclusion in demo mode", () => {
    vi.stubEnv("ISHMT_DEMO_DATA", "true");
    const scoped = withDemoDataApplicationScope({ deletedAt: null });
    expect(scoped).toEqual({
      AND: [
        { deletedAt: null },
        {
          NOT: {
            applicationNumber: { startsWith: "MIG-" },
          },
        },
      ],
    });
  });

  it("detects legacy migration application numbers", () => {
    vi.stubEnv("ISHMT_DEMO_DATA", "true");
    expect(elevatorMatchesDemoDataMode("MIG-000901-TR")).toBe(false);
    expect(elevatorMatchesDemoDataMode("APP-2025-REG-001")).toBe(true);
  });
});
