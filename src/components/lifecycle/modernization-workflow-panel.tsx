"use client";

import { ApplicationStatus, ApplicationType, DelegationStatus } from "@prisma/client";
import {
  AssignCertifierFormWrapper,
  AssignInstallerFormWrapper,
} from "@/components/owner/owner-application-forms";
import { ModernizationForm } from "@/components/lifecycle/modernization-form";
import type { SelectableRegistryCompany } from "@/lib/organizations/registry-company-display";
import {
  ApplicationWorkflowLayout,
  ApplicationWorkflowSection,
  type WorkflowStep,
} from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { RegistrationWaitingPanel } from "@/components/registration/registration-waiting-panel";
import {
  revokeCertifierDelegationAction,
  revokeInstallerDelegationAction,
} from "@/lib/actions/delegation-actions";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { SummaryField, SummaryGrid } from "@/components/registration/registration-ui";
import type { ModernizationType } from "@prisma/client";

type Company = SelectableRegistryCompany;

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
  certifiers,
  installers,
  installerOrgId,
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
  certifiers: Company[];
  installers: Company[];
  installerOrgId?: string | null;
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

      {status === ApplicationStatus.PENDING_INSTALLER && hasInstaller && (
        <ApplicationWorkflowSection title="Instaluesi">
          <RegistrationWaitingPanel
            companyName={installerName}
            roleLabel="instaluesit"
            onRevoke={(reason) => revokeInstallerDelegationAction(applicationId, reason)}
          />
        </ApplicationWorkflowSection>
      )}

      {hasInstaller && status !== ApplicationStatus.PENDING_INSTALLER && (
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
          <AssignCertifierFormWrapper
            applicationId={applicationId}
            certifiers={certifiers}
            installerOrgId={installerOrgId}
          />
        </ApplicationWorkflowSection>
      )}

      {status === ApplicationStatus.PENDING_CERTIFIER && hasCertifier && (
        <ApplicationWorkflowSection title="Certifikuesi">
          <RegistrationWaitingPanel
            companyName={certifierName}
            roleLabel="certifikuesit"
            onRevoke={(reason) => revokeCertifierDelegationAction(applicationId, reason)}
          />
        </ApplicationWorkflowSection>
      )}

      {hasCertifier && status !== ApplicationStatus.PENDING_CERTIFIER && (
        <ApplicationWorkflowSection title="Certifikuesi">
          <SummaryField label="Kompania" value={certifierName} />
        </ApplicationWorkflowSection>
      )}
    </ApplicationWorkflowLayout>
  );
}
