import { describe, expect, it } from "vitest";
import { MaintenanceContractStatus } from "@prisma/client";
import { certifierCanManageMaintenanceOnElevator } from "@/lib/certifier/certifier-maintenance-access";

describe("certifierCanManageMaintenanceOnElevator", () => {
  it("returns false without org id", () => {
    expect(
      certifierCanManageMaintenanceOnElevator({
        orgId: null,
        maintenanceContracts: [
          {
            serviceType: "MAINTENANCE",
            isActive: true,
            status: MaintenanceContractStatus.ACTIVE,
            maintenanceOrgId: "org-1",
          },
        ],
      }),
    ).toBe(false);
  });

  it("returns false for periodic inspection only", () => {
    expect(
      certifierCanManageMaintenanceOnElevator({
        orgId: "org-1",
        maintenanceContracts: [
          {
            serviceType: "PERIODIC_INSPECTION",
            isActive: true,
            status: MaintenanceContractStatus.ACTIVE,
            maintenanceOrgId: "org-1",
          },
        ],
      }),
    ).toBe(false);
  });

  it("returns true for active maintenance contract with same org", () => {
    expect(
      certifierCanManageMaintenanceOnElevator({
        orgId: "org-1",
        maintenanceContracts: [
          {
            serviceType: "MAINTENANCE",
            isActive: true,
            status: MaintenanceContractStatus.ACTIVE,
            maintenanceOrgId: "org-1",
          },
        ],
      }),
    ).toBe(true);
  });

  it("returns true for pending maintenance contract with same org", () => {
    expect(
      certifierCanManageMaintenanceOnElevator({
        orgId: "org-1",
        maintenanceContracts: [
          {
            serviceType: "MAINTENANCE",
            isActive: false,
            status: MaintenanceContractStatus.PENDING,
            maintenanceOrgId: "org-1",
          },
        ],
      }),
    ).toBe(true);
  });

  it("returns false when maintenance contract belongs to another org", () => {
    expect(
      certifierCanManageMaintenanceOnElevator({
        orgId: "org-1",
        maintenanceContracts: [
          {
            serviceType: "MAINTENANCE",
            isActive: true,
            status: MaintenanceContractStatus.ACTIVE,
            maintenanceOrgId: "org-2",
          },
        ],
      }),
    ).toBe(false);
  });
});
