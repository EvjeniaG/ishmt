import { cn } from "@/lib/utils";
import { AlertPanel } from "@/components/registration/registration-ui";
import { ApplicationStepper, workflowStepsToStepper } from "@/components/applications/application-stepper";
import { RotateCcw } from "lucide-react";

export type WorkflowStep = {
  key: string;
  label: string;
  done?: boolean;
  active?: boolean;
};

export function ApplicationWorkflowLayout({
  steps,
  children,
}: {
  steps: WorkflowStep[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <ApplicationStepper steps={workflowStepsToStepper(steps)} />
      {children}
    </div>
  );
}

export function ApplicationWorkflowSection({
  title,
  description,
  children,
  headerExtra,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="workflow-section-title">{title}</h2>
            {description && <p className="workflow-section-desc">{description}</p>}
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="workflow-section-body">{children}</div>
    </section>
  );
}

export function ApplicationReturnBanner({
  returnReason,
  requiredCorrection,
}: {
  returnReason?: string | null;
  requiredCorrection?: string | null;
}) {
  if (!returnReason && !requiredCorrection) return null;
  return (
    <AlertPanel variant="warning" title="Kthyer për korrigjim" icon={RotateCcw}>
      {returnReason && <p>Arsyeja: {returnReason}</p>}
      {requiredCorrection && <p className="mt-1">Kërkohet: {requiredCorrection}</p>}
    </AlertPanel>
  );
}

export function ApplicationWorkflowFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="workflow-footer">
      <div className="workflow-footer-body">{children}</div>
    </div>
  );
}

export function ApplicationElevatorSummary({
  registryNumber,
  address,
  ownerName,
  ownerNipt,
}: {
  registryNumber: string;
  address?: string | null;
  ownerName: string;
  ownerNipt?: string | null;
}) {
  return (
    <dl className="workflow-data-grid">
      <div className="workflow-data-cell">
        <dt className="workflow-data-label">Regjistri</dt>
        <dd className="workflow-data-value font-mono">{registryNumber}</dd>
      </div>
      {address && (
        <div className="workflow-data-cell">
          <dt className="workflow-data-label">Adresa</dt>
          <dd className="workflow-data-value">{address}</dd>
        </div>
      )}
      <div className={cn("workflow-data-cell", !address && "sm:col-span-2")}>
        <dt className="workflow-data-label">Personi përgjegjës i ashensorit</dt>
        <dd className="workflow-data-value">
          {ownerName}
          {ownerNipt ? ` · ${ownerNipt}` : ""}
        </dd>
      </div>
    </dl>
  );
}
