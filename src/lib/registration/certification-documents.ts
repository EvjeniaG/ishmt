import { ApplicationType, type ApplicationData } from "@prisma/client";
import {
  getApplicationDocumentSpecs,
  getMissingRequiredApplicationDocuments,
} from "@/lib/documents/application-document-checklist";

/** Document checklist for the certification step (Workflow 1, Step 5). */

export type CertificationDocSpec = {
  purpose: string;
  label: string;
  maxMb: number;
  accept: string;
};

export const REQUIRED_CERTIFICATION_DOCS: CertificationDocSpec[] = [
  {
    purpose: "INITIAL_INSPECTION_CERT",
    label: "Raport ose certifikatë ekzaminimi nga OMI",
    maxMb: 10,
    accept: "application/pdf,image/jpeg,image/png",
  },
  {
    purpose: "TECHNICAL_DOSSIER",
    label: "Dokumentacion teknik i ashensorit",
    maxMb: 20,
    accept: "application/pdf",
  },
];

export const OPTIONAL_CERTIFICATION_DOCS: CertificationDocSpec[] = [
  {
    purpose: "ADDITIONAL_TECHNICAL",
    label: "Dokumentacion shtesë teknik",
    maxMb: 20,
    accept: "application/pdf,image/jpeg,image/png",
  },
];

export const REQUIRED_CERTIFICATION_PURPOSES = REQUIRED_CERTIFICATION_DOCS.map((d) => d.purpose);

export function getCertificationDocsForApplication(data?: Partial<ApplicationData> | null): {
  required: CertificationDocSpec[];
  optional: CertificationDocSpec[];
} {
  const allSpecs = getApplicationDocumentSpecs({
    type: ApplicationType.NEW_REGISTRATION,
    data,
  });
  const certificationPurposes = new Set([
    "INITIAL_INSPECTION_CERT",
    "TECHNICAL_DOSSIER",
    "EU_DECLARATION_CE",
  ]);
  const mapped = allSpecs
    .filter((item) => certificationPurposes.has(item.purpose))
    .map((item) => ({
      purpose: item.purpose,
      label: item.label,
      maxMb: item.maxMb,
      accept: item.accept,
    }));

  const requiredPurposes = new Set(
    getMissingRequiredApplicationDocuments({
      type: ApplicationType.NEW_REGISTRATION,
      data,
      uploadedPurposes: [],
    }).map((missing) => missing.purpose),
  );

  return {
    required: mapped.filter((item) => requiredPurposes.has(item.purpose)),
    optional: mapped.filter((item) => !requiredPurposes.has(item.purpose)),
  };
}

export function missingCertificationDocs(uploadedPurposes: string[]): CertificationDocSpec[] {
  return REQUIRED_CERTIFICATION_DOCS.filter((d) => !uploadedPurposes.includes(d.purpose));
}
