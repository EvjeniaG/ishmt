import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { WorkflowSection } from "@/components/applications/workflow-section";
import { Button } from "@/components/ui/button";

export function DelegationCompletePanel({
  roleLabel,
  applicationNumber,
  description,
  approved = false,
  registryNumber,
}: {
  roleLabel: "instalues" | "certifikues";
  applicationNumber: string;
  description: string;
  approved?: boolean;
  registryNumber?: string | null;
}) {
  return (
    <WorkflowSection
      title={approved ? "Regjistrimi u miratua" : `Pjesa juaj si ${roleLabel}`}
      description={description}
      className="border-l-[3px] border-l-gov-success"
      headerExtra={
        <span className="workflow-status-done shrink-0">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          {approved ? "Miratuar" : "Përfunduar"}
        </span>
      }
    >
      <div className="space-y-4">
        <dl className="workflow-data-grid">
          <div className="workflow-data-cell">
            <dt className="workflow-data-label">Nr. aplikimi</dt>
            <dd className="workflow-data-value font-mono">{applicationNumber}</dd>
          </div>
          {approved && registryNumber ? (
            <div className="workflow-data-cell">
              <dt className="workflow-data-label">Nr. regjistri</dt>
              <dd className="workflow-data-value font-mono">{registryNumber}</dd>
            </div>
          ) : null}
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {approved
            ? "Ashensori është regjistruar në regjistrin kombëtar. Më poshtë gjeni të dhënat teknike dhe dokumentacionin e dorëzuar."
            : "Procesi vazhdon te personi përgjegjës i ashensorit. Do të njoftoheni nëse kërkohet korrigjim."}
        </p>
        <Button asChild variant="outline" className="rounded-lg border-border text-gov-primary hover:bg-gov-primary/[0.04]">
          <Link href="/portal/applications">Kthehu te aplikimet</Link>
        </Button>
      </div>
    </WorkflowSection>
  );
}

export function RevokedDelegationPanel({
  roleLabel,
  applicationNumber,
  reason,
}: {
  roleLabel: "instalues" | "certifikues";
  applicationNumber: string;
  reason?: string | null;
}) {
  return (
    <WorkflowSection
      title="Ftesa u tërhoq"
      description={`Personi përgjegjës i ashensorit tërhoqi ftesën tuaj si ${roleLabel}.`}
      className="border-l-[3px] border-l-amber-500"
      headerExtra={
        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          E tërhequr
        </span>
      }
    >
      <div className="space-y-4">
        <dl className="workflow-data-grid">
          <div className="workflow-data-cell">
            <dt className="workflow-data-label">Nr. aplikimi</dt>
            <dd className="workflow-data-value font-mono">{applicationNumber}</dd>
          </div>
          {reason?.trim() ? (
            <div className="workflow-data-cell sm:col-span-2">
              <dt className="workflow-data-label">Arsyeja e tërheqjes</dt>
              <dd className="workflow-data-value">{reason.trim()}</dd>
            </div>
          ) : null}
        </dl>
        <Button asChild variant="outline" className="border-border text-gov-primary hover:bg-gov-primary/[0.04]">
          <Link href="/portal/applications">Kthehu te aplikimet</Link>
        </Button>
      </div>
    </WorkflowSection>
  );
}
