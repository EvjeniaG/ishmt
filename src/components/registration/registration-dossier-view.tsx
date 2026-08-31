"use client";

import type { ReactNode } from "react";
import { WorkflowSection, WorkflowSubsection } from "@/components/applications/workflow-section";
import { ApplicationDossier } from "@/components/registration/application-dossier";
import type { DossierSection } from "@/lib/registration/build-dossier";

const COLLAPSIBLE_SECTION_IDS = new Set(["installer", "technical", "certifier", "certification"]);

type DocumentSection = {
  id: string;
  title: string;
  slot: ReactNode;
  ownerHint?: boolean;
};

export function RegistrationDossierView({
  sections,
  ownerDocsSlot,
  installerDocsSlot,
  certifierDocsSlot,
  canUploadOwnerDocs = false,
}: {
  sections: DossierSection[];
  ownerDocsSlot?: React.ReactNode;
  installerDocsSlot?: React.ReactNode;
  certifierDocsSlot?: React.ReactNode;
  canUploadOwnerDocs?: boolean;
}) {
  const documentSections: DocumentSection[] = [];

  if (ownerDocsSlot) {
    documentSections.push({
      id: "owner-docs",
      title: "Personi përgjegjës",
      slot: ownerDocsSlot,
      ownerHint: canUploadOwnerDocs,
    });
  }
  if (installerDocsSlot) {
    documentSections.push({
      id: "installer-docs",
      title: "Instaluesi",
      slot: installerDocsSlot,
    });
  }
  if (certifierDocsSlot) {
    documentSections.push({
      id: "certifier-docs",
      title: "Certifikuesi (OM)",
      slot: certifierDocsSlot,
    });
  }

  return (
    <div className="space-y-6">
      <div className="reg-wizard-subsection">
        <ApplicationDossier
          sections={sections}
          hideEmpty
          collapsibleSectionIds={COLLAPSIBLE_SECTION_IDS}
        />
      </div>

      {documentSections.length > 0 && (
        <WorkflowSection title="Dokumentet" description="Dosja e ngarkuar në aplikim">
          <div className="space-y-6">
            {documentSections.map((section) => (
              <WorkflowSubsection key={section.id} title={section.title}>
                {section.ownerHint ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Ngarkoni dokumentet që mungojnë (p.sh. planvendosjen) para parashtrimit te IQMT.
                    </p>
                    {section.slot}
                  </div>
                ) : (
                  section.slot
                )}
              </WorkflowSubsection>
            ))}
          </div>
        </WorkflowSection>
      )}
    </div>
  );
}
