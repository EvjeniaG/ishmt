import { AppShell } from "@/components/layout/app-shell";
import { DelegateWorkflowProgress } from "@/components/registration/delegate-workflow-progress";
import { RegistrationStatusBanner } from "@/components/registration/registration-status-banner";
import { WorkflowProgress } from "@/components/registration/workflow-progress";
import {
  isOwnerRegistrationPhase,
  type RegistrationPhase,
} from "@/lib/registration/phase-router";
import type { ApplicationStatus } from "@prisma/client";
import type { RoleCode } from "@/lib/constants/roles";

function installerSteps(phase: RegistrationPhase) {
  return [
    { label: "Pranimi i ftesës", done: phase !== "installer-accept", active: phase === "installer-accept" },
    {
      label: "Të dhënat teknike",
      done: phase === "installer-complete",
      active: phase === "technical-data",
    },
    { label: "Përfunduar", done: phase === "installer-complete", active: false },
  ];
}

function certifierSteps(phase: RegistrationPhase) {
  return [
    { label: "Pranimi i ftesës", done: phase !== "certifier-accept", active: phase === "certifier-accept" },
    {
      label: "Certifikimi",
      done: phase === "certifier-complete",
      active: phase === "certification-data",
    },
    { label: "Përfunduar", done: phase === "certifier-complete", active: false },
  ];
}

export function RegistrationLayout({
  applicationNumber,
  status,
  phase,
  roleCode,
  children,
}: {
  applicationNumber: string;
  status: ApplicationStatus;
  phase: RegistrationPhase;
  roleCode?: RoleCode;
  children: React.ReactNode;
}) {
  const ownerPhase = isOwnerRegistrationPhase(phase);
  const isInstallerDelegate = ["installer-accept", "technical-data", "installer-complete"].includes(phase);
  const isCertifierDelegate = ["certifier-accept", "certification-data", "certifier-complete"].includes(phase);

  return (
    <AppShell title="Kërkesë për regjistrimin e ashensorit">
      <div className="mx-auto max-w-5xl space-y-6">
        <RegistrationStatusBanner applicationNumber={applicationNumber} phase={phase} status={status} roleCode={roleCode} />

        {isInstallerDelegate && (
          <DelegateWorkflowProgress title="Fazat e instaluesit" steps={installerSteps(phase)} />
        )}
        {isCertifierDelegate && (
          <DelegateWorkflowProgress title="Fazat e certifikuesit" steps={certifierSteps(phase)} />
        )}
        {ownerPhase && !["submitted", "completed", "rejected", "review"].includes(phase) && (
          <WorkflowProgress phase={phase} />
        )}

        {children}
      </div>
    </AppShell>
  );
}
