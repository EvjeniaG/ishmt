import { DocumentClassification } from "@prisma/client";
import { isSupplementaryDocumentPurpose } from "@/lib/documents/application-document-checklist";

const EXCLUDED_CLASSIFICATIONS = new Set<DocumentClassification>([
  DocumentClassification.INSPECTION_REPORT,
  DocumentClassification.MAINTENANCE_LOG,
  DocumentClassification.CITIZEN_REPORT,
]);

/** Dokumente operacionale që shfaqen te skedat Inspektimet / Mirëmbajtje, jo te Dosja. */
const EXCLUDED_PURPOSES = new Set([
  "PERIODIC_INSPECTION",
  "MONTHLY_REPORT",
  "INTERVENTION",
  "EXTRAORDINARY_INSPECTION",
  "FIELD_VERIFICATION_REPORT",
  "PERIODIC_INSPECTION_CONTRACT",
  "MAINTENANCE_CONTRACT",
  "QR_IMAGE",
  "QR_PLACEMENT",
]);

export function isRegistrationDossierDocument(doc: {
  classification: string;
  purpose?: string | null;
}): boolean {
  if (EXCLUDED_CLASSIFICATIONS.has(doc.classification as DocumentClassification)) {
    return false;
  }
  if (doc.purpose && EXCLUDED_PURPOSES.has(doc.purpose)) {
    return false;
  }
  if (doc.purpose && isSupplementaryDocumentPurpose(doc.purpose)) {
    return false;
  }
  return true;
}

export function filterRegistrationDossierDocuments<T extends { classification: string; purpose?: string | null }>(
  documents: T[],
): T[] {
  return documents.filter(isRegistrationDossierDocument);
}
