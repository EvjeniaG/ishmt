import { UsagePurpose } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ishmt/chief-inspector", () => ({
  resolveChiefInspectorDisplayName: vi.fn(async () => "Edison Konomi"),
}));

import { buildCertificatePdfVariables } from "@/lib/services/post-approval-asset-service";

describe("buildCertificatePdfVariables", () => {
  it("keeps registration fields from baseline and updates owner after transfer", async () => {
    const variables = await buildCertificatePdfVariables({
      certificate: { certificateNumber: "CR00001" },
      elevator: {
        registryNumber: "000903 TR",
        buildingAddress: "Rruga e Dibrës Nr. 15, Tiranë",
        ownerOrg: { name: "Kompani Ndërtimi Demo", nipt: "L6040406A" },
        municipality: { nameSq: "Tiranë" },
        technicalData: { manufacturer: "Otis", serialNumber: "SN-903" },
        installerOrg: { name: "Ashensorë Pro Sh.p.k." },
      },
      baselineApplication: {
        applicationNumber: "APP-2026-REG-000002",
        installerOrg: { name: "Ashensorë Pro Sh.p.k." },
        data: {
          usagePurpose: UsagePurpose.ELECTRIC_PASSENGER,
          omiNumber: "OM-123",
          examinationType: "INITIAL",
          responsibleEntityName: "Arben Demo",
          responsibleEntityIdentifier: "I90404004D",
        },
      },
      application: {
        applicationNumber: "APP-2026-UPD-000001",
        installerOrg: null,
        data: {
          responsibleEntityName: "Kompani Ndërtimi Demo",
          responsibleEntityIdentifier: "L6040406A",
        },
      },
      issuedDate: "31.8.2026",
      actorId: "user-1",
    });

    expect(variables.ownerName).toBe("Kompani Ndërtimi Demo");
    expect(variables.responsibleIdentifier).toBe("L6040406A");
    expect(variables.applicationNumber).toBe("APP-2026-REG-000002");
    expect(variables.installerName).toBe("Ashensorë Pro Sh.p.k.");
    expect(variables.usagePurpose).toBe("Transport Njerëzish Elektrik");
    expect(variables.omiNumber).toBe("OM-123");
    expect(variables.manufacturer).toBe("Otis");
  });
});
