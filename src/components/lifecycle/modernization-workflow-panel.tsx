"use client";

import { ApplicationStatus, ApplicationType } from "@prisma/client";
import {
  AssignCertifierFormWrapper,
  AssignInstallerFormWrapper,
} from "@/components/owner/owner-application-forms";
import { ModernizationForm } from "@/components/lifecycle/modernization-form";
import {
  ApplicationReturnBanner,
  ApplicationWorkflowLayout,
  ApplicationWorkflowSection,
  type WorkflowStep,
} from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { SummaryField, SummaryGrid } from "@/components/registration/registration-ui";
import type { ModernizationType } from "@prisma/client";

type Company = { id: string; name: string };

export function ModernizationWorkflowPanel({
  applicationId,
  status,
  returnReason,
  requiredCorrection,
  modernizationType,
  modernizationNotes,
  installerName,
  certifierName,
  hasInstaller,
  hasCertifier,
  installers,
  certifiers,
}: {
  applicationId: string;
  status: ApplicationStatus;
  returnReason?: string | null;
  requiredCorrection?: string | null;
  modernizationType?: ModernizationType | null;
  modernizationNotes?: string | null;
  installerName?: string | null;
  certifierName?: string | null;
  hasInstaller: boolean;
  hasCertifier: boolean;
  installers: Company[];
  certifiers: Company[];
}) {
  const editable = status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED;

  const steps: WorkflowStep[] = [
    { key: "data", label: "Modernizimi", done: Boolean(modernizationType), active: editable && !modernizationType },
    { key: "installer", label: "Instaluesi", done: hasInstaller, active: Boolean(modernizationType) && !hasInstaller },
    { key: "certifier", label: "Certifikuesi", done: hasCertifier, active: hasInstaller && !hasCertifier },
    { key: "docs", label: "Dokumentet", active: hasInstaller && hasCertifier && editable },
    { key: "submit", label: "Parashtrimi", active: hasInstaller && hasCertifier && editable },
  ];

  return (
    <ApplicationWorkflowLayout steps={steps}>
      <ApplicationReturnBanner returnReason={returnReason} requiredCorrection={requiredCorrection} />

      {editable && !modernizationType && (
        <ApplicationWorkflowSection
          title="Të dhënat e modernizimit"
          headerExtra={
            <ApplicationDemoButton
              applicationId={applicationId}
              type={ApplicationType.MODERNIZATION}
              status={status}
              hasModernization={Boolean(modernizationType)}
              hasInstaller={hasInstaller}
              hasCertifier={hasCertifier}
            />
          }
        >
          <ModernizationForm
            applicationId={applicationId}
            currentType={modernizationType}
            currentNotes={modernizationNotes}
          />
        </ApplicationWorkflowSection>
      )}

      {modernizationType && (
        <ApplicationWorkflowSection title="Modernizimi">
          <SummaryGrid>
            <SummaryField label="Lloji" value={MODERNIZATION_TYPE_LABELS[modernizationType]} />
            <SummaryField label="Përshkrimi" value={modernizationNotes ?? "-"} />
          </SummaryGrid>
        </ApplicationWorkflowSection>
      )}

      {status === ApplicationStatus.DRAFT && modernizationType && !hasInstaller && (
        <ApplicationWorkflowSection
          title="Instaluesi"
          headerExtra={
            <ApplicationDemoButton
              applicationId={applicationId}
              type={ApplicationType.MODERNIZATION}
              status={status}
              hasModernization={Boolean(modernizationType)}
              hasInstaller={hasInstaller}
              hasCertifier={hasCertifier}
            />
          }
        >
          <AssignInstallerFormWrapper applicationId={applicationId} installers={installers} />
        </ApplicationWorkflowSection>
      )}

      {hasInstaller && (
        <ApplicationWorkflowSection title="Instaluesi">
          <SummaryField label="Kompania" value={installerName} />
        </ApplicationWorkflowSection>
      )}

      {hasInstaller && !hasCertifier && status === ApplicationStatus.INSTALLER_COMPLETED && (
        <ApplicationWorkflowSection
          title="Certifikuesi"
          headerExtra={
            <ApplicationDemoButton
              applicationId={applicationId}
              type={ApplicationType.MODERNIZATION}
              status={status}
              hasModernization={Boolean(modernizationType)}
              hasInstaller={hasInstaller}
              hasCertifier={hasCertifier}
            />
          }
        >
          <AssignCertifierFormWrapper applicationId={applicationId} certifiers={certifiers} />
        </ApplicationWorkflowSection>
      )}

      {hasCertifier && (
        <ApplicationWorkflowSection title="Certifikuesi">
          <SummaryField label="Kompania" value={certifierName} />
        </ApplicationWorkflowSection>
      )}
    </ApplicationWorkflowLayout>
  );
}
