import { describe, expect, it } from "vitest";
import {
  labelDocumentClassification,
  labelDocumentPurpose,
  resolveElevatorDocumentGroup,
} from "@/lib/documents/document-display-labels";

describe("document-display-labels", () => {
  it("maps classification enums to Albanian labels", () => {
    expect(labelDocumentClassification("INTERNAL_ISHMT")).toBe("IQMT");
    expect(labelDocumentClassification("INSPECTION_REPORT")).toBe("Raport inspektimi");
  });

  it("maps known purposes to checklist labels", () => {
    expect(
      labelDocumentPurpose({
        purpose: "FORWARDING_LETTER",
        originalFilename: "leter-APP-2026-DEMO-08.pdf",
      }),
    ).toBe("Letër zyrtare përcjellëse");

    expect(
      labelDocumentPurpose({
        purpose: "LAYOUT_PLAN",
        originalFilename: "demo-layout_plan.pdf",
      }),
    ).toBe("Planvendosje ose dokument pozicionimi në ndërtesë");
  });

  it("humanizes unknown demo filenames", () => {
    expect(
      labelDocumentPurpose({
        purpose: undefined,
        originalFilename: "demo-technical_dossier.pdf",
      }),
    ).toBe("Technical Dossier");
  });

  it("groups documents by category", () => {
    expect(
      resolveElevatorDocumentGroup({
        purpose: "FORWARDING_LETTER",
        classification: "INTERNAL_ISHMT",
      }),
    ).toBe("registration");

    expect(
      resolveElevatorDocumentGroup({
        purpose: "FIELD_VERIFICATION_REPORT",
        classification: "INSPECTION_REPORT",
      }),
    ).toBe("inspection");
  });
});
