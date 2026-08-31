import { describe, expect, it } from "vitest";
import {
  filterRegistrationDossierDocuments,
  isRegistrationDossierDocument,
} from "@/lib/documents/registration-dossier-documents";

describe("registration-dossier-documents", () => {
  it("keeps registration application documents", () => {
    expect(
      isRegistrationDossierDocument({
        classification: "TECHNICAL",
        purpose: "LAYOUT_PLAN",
      }),
    ).toBe(true);
  });

  it("excludes inspection and maintenance operational documents", () => {
    expect(
      isRegistrationDossierDocument({
        classification: "INSPECTION_REPORT",
        purpose: "PERIODIC_INSPECTION",
      }),
    ).toBe(false);

    expect(
      isRegistrationDossierDocument({
        classification: "MAINTENANCE_LOG",
        purpose: "MONTHLY_REPORT",
      }),
    ).toBe(false);
  });

  it("filters mixed document lists", () => {
    const docs = [
      { id: "1", classification: "CERTIFICATE", purpose: "EU_DECLARATION_CE" },
      { id: "2", classification: "INSPECTION_REPORT", purpose: "PERIODIC_INSPECTION" },
    ];
    expect(filterRegistrationDossierDocuments(docs)).toEqual([docs[0]]);
  });
});
