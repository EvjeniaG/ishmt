"use client";

import {
  ApplicationDocuments,
  type ApplicationDocumentRow,
} from "@/components/applications/application-documents";
import type { ApplicationDocumentSpec, RegistrationDocPhase } from "@/lib/documents/application-document-checklist";

type ChecklistItem = ApplicationDocumentSpec & { uploaded: boolean };

/** Pamje e dokumenteve të aplikimit - lexim ose ngarkim sipas lejes. */
export function ApplicationDocumentChecklistView({
  applicationId,
  checklist,
  documents,
  currentUserId,
  supplementaryPhase,
  canUpload = false,
}: {
  applicationId: string;
  checklist: ChecklistItem[];
  documents: ApplicationDocumentRow[];
  currentUserId?: string | null;
  supplementaryPhase?: RegistrationDocPhase;
  canUpload?: boolean;
}) {
  return (
    <ApplicationDocuments
      applicationId={applicationId}
      documents={documents}
      canUpload={canUpload}
      currentUserId={currentUserId}
      checklist={checklist}
      embedded
      supplementaryPhase={supplementaryPhase}
    />
  );
}
