import { ApplicationType, type ApplicationData } from "@prisma/client";
import {
  getApplicationDocumentSpecs,
  getMissingRequiredApplicationDocuments,
  CERTIFIER_COMPLETION_DOC_PHASES,
} from "@/lib/documents/application-document-checklist";

/** Document checklist for the certification step (Workflow 1, Step 5). */

export type CertificationDocSpec = {
  purpose: string;
  label: string;
  maxMb: number;
  accept: string;
};

export function getCertificationDocsForApplication(data?: Partial<ApplicationData> | null): {
  required: CertificationDocSpec[];
  optional: CertificationDocSpec[];
} {
  const phaseSet = new Set(CERTIFIER_COMPLETION_DOC_PHASES);
  const allSpecs = getApplicationDocumentSpecs({
    type: ApplicationType.NEW_REGISTRATION,
    data,
  }).filter((item) => phaseSet.has(item.phase));

  const mapped = allSpecs.map((item) => ({
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
    })
      .filter((missing) => phaseSet.has(missing.phase))
      .map((missing) => missing.purpose),
  );

  return {
    required: mapped.filter((item) => requiredPurposes.has(item.purpose)),
    optional: mapped.filter((item) => !requiredPurposes.has(item.purpose)),
  };
}

export const OPTIONAL_CERTIFICATION_DOCS: CertificationDocSpec[] = [
  {
    purpose: "ADDITIONAL_TECHNICAL",
    label: "Dokumentacion shtesë teknik",
    maxMb: 20,
    accept: "application/pdf,image/jpeg,image/png",
  },
];

/** @deprecated Prefer getCertificationDocsForApplication(applicationData).required */
export function getRequiredCertificationDocs(data?: Partial<ApplicationData> | null): CertificationDocSpec[] {
  return getCertificationDocsForApplication(data).required;
}

export function missingCertificationDocs(
  uploadedPurposes: string[],
  data?: Partial<ApplicationData> | null,
): CertificationDocSpec[] {
  const { required } = getCertificationDocsForApplication(data);
  return required.filter((d) => !uploadedPurposes.includes(d.purpose));
}
