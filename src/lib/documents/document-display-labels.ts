import { ApplicationType, DocumentClassification } from "@prisma/client";
import { getApplicationDocumentSpecs } from "@/lib/documents/application-document-checklist";

export const DOCUMENT_CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  APPLICATION: "Aplikim",
  TECHNICAL: "Teknik",
  CERTIFICATE: "Certifikatë",
  INSPECTION_REPORT: "Raport inspektimi",
  MAINTENANCE_LOG: "Ditar mirëmbajtjeje",
  INTERNAL_ISHMT: "IQMT",
  CITIZEN_REPORT: "Raport qytetari",
  OTHER: "Tjetër",
};

const EXTRA_PURPOSE_LABELS: Record<string, string> = {
  FORWARDING_LETTER: "Letër zyrtare përcjellëse",
  REGISTRATION_PDF: "Certifikatë regjistrimi",
  QR_IMAGE: "Imazh kodi QR",
  EXTRAORDINARY_INSPECTION: "Raport inspektimi të jashtëzakonshëm",
  FIELD_VERIFICATION_REPORT: "Raport verifikimi në terren",
  PERIODIC_INSPECTION_REPORT: "Raport inspektimi periodik",
  INSTALLATION_DOCUMENT: "Dokumentacion i instalimit",
  TECHNICAL_DOSSIER: "Dosje teknike e instalimit",
  OTHER: "Dokument shtesë",
};

function buildPurposeLabelMap(): Record<string, string> {
  const map: Record<string, string> = { ...EXTRA_PURPOSE_LABELS };
  for (const type of Object.values(ApplicationType)) {
    for (const spec of getApplicationDocumentSpecs({ type, data: null })) {
      map[spec.purpose] = spec.label;
    }
  }
  return map;
}

const PURPOSE_LABELS = buildPurposeLabelMap();

export function labelDocumentClassification(classification: string): string {
  return DOCUMENT_CLASSIFICATION_LABELS[classification as DocumentClassification] ?? classification;
}

function humanizeToken(raw: string): string {
  return raw
    .replace(/^demo-/i, "")
    .replace(/\.(pdf|docx?|xlsx?|png|jpe?g|webp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function labelDocumentPurpose(input: {
  purpose?: string | null;
  originalFilename: string;
}): string {
  if (input.purpose && PURPOSE_LABELS[input.purpose]) {
    return PURPOSE_LABELS[input.purpose];
  }
  if (input.purpose) {
    return humanizeToken(input.purpose);
  }
  return humanizeToken(input.originalFilename);
}

export type ElevatorDocumentGroup =
  | "registration"
  | "application"
  | "technical"
  | "inspection"
  | "maintenance"
  | "other";

export const ELEVATOR_DOCUMENT_GROUP_LABELS: Record<ElevatorDocumentGroup, string> = {
  registration: "Certifikata dhe regjistrimi",
  application: "Aplikimi dhe kërkesa",
  technical: "Dokumentacion teknik",
  inspection: "Inspektim dhe raporte",
  maintenance: "Mirëmbajtje",
  other: "Dokumente të tjera",
};

export const ELEVATOR_DOCUMENT_GROUP_ORDER: ElevatorDocumentGroup[] = [
  "registration",
  "application",
  "technical",
  "inspection",
  "maintenance",
  "other",
];

export function resolveElevatorDocumentGroup(doc: {
  purpose?: string | null;
  classification: string;
}): ElevatorDocumentGroup {
  if (doc.classification === "CERTIFICATE" || doc.classification === "INTERNAL_ISHMT") {
    return "registration";
  }
  if (doc.classification === "APPLICATION") return "application";
  if (doc.classification === "TECHNICAL") return "technical";
  if (doc.classification === "INSPECTION_REPORT") return "inspection";
  if (doc.classification === "MAINTENANCE_LOG") return "maintenance";
  return "other";
}
