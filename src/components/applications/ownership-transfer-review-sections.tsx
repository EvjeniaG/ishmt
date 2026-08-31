import { WorkflowSection } from "@/components/applications/workflow-section";
import { DELEGATION_STATUS_LABELS } from "@/lib/constants/display-labels";
import type { DelegationStatus } from "@prisma/client";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";

export type OwnershipRecipientSummary = {
  name: string;
  nipt?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  representativeName?: string | null;
  representativeNid?: string | null;
  representativeEmail?: string | null;
  representativePhone?: string | null;
  delegationStatus?: DelegationStatus | null;
};

function DetailGrid({ fields }: { fields: { label: string; value?: string | null }[] }) {
  const visible = fields.filter((f) => f.value && f.value.trim() !== "");
  if (visible.length === 0) return null;
  return (
    <dl className="workflow-data-grid">
      {visible.map((f) => (
        <div key={f.label} className="workflow-data-cell">
          <dt className="workflow-data-label">{f.label}</dt>
          <dd className="workflow-data-value break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OwnershipTransferReviewSections({
  currentOwnerName,
  currentOwnerNipt,
  recipient,
  elevatorRegistry,
  elevatorAddress,
  transferReason,
}: {
  currentOwnerName: string;
  currentOwnerNipt?: string | null;
  recipient: OwnershipRecipientSummary | null;
  elevatorRegistry?: string | null;
  elevatorAddress?: string | null;
  transferReason?: string | null;
}) {
  const delegationLabel = recipient?.delegationStatus
    ? DELEGATION_STATUS_LABELS[recipient.delegationStatus] ?? recipient.delegationStatus
    : null;

  return (
    <>
      <WorkflowSection
        title="Dosja e aplikimit"
        description="Transferim i përgjegjësisë për ashensorin"
      >
        <div className="workflow-data-grid">
          <div className="workflow-data-cell">
            <p className="workflow-data-label">Personi përgjegjës aktual</p>
            <p className="workflow-data-value">
              {currentOwnerName}
              {currentOwnerNipt ? ` · ${currentOwnerNipt}` : ""}
            </p>
          </div>
          <div className="workflow-data-cell">
            <p className="workflow-data-label">Ashensori</p>
            <p className="workflow-data-value">{elevatorRegistry ?? "-"}</p>
          </div>
          <div className="workflow-data-cell md:col-span-2">
            <p className="workflow-data-label">Adresa e ashensorit</p>
            <p className="workflow-data-value">{elevatorAddress ?? "-"}</p>
          </div>
        </div>
      </WorkflowSection>

      <WorkflowSection
        title="Marrësi i pronësisë"
        description="Subjekti i ri që merr përgjegjësinë e ashensorit"
      >
        {recipient ? (
          <div className="space-y-6">
            <DetailGrid
              fields={[
                { label: "Emri i subjektit", value: recipient.name },
                { label: "NIPT / NID", value: recipient.nipt },
                { label: "Statusi i ftesës", value: delegationLabel },
                { label: "Adresa e subjektit", value: recipient.address },
                { label: "Email i subjektit", value: recipient.email },
                { label: "Telefon i subjektit", value: recipient.phone },
              ]}
            />
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Përfaqësuesi i subjektit</h3>
              <DetailGrid
                fields={[
                  { label: "Emri", value: recipient.representativeName },
                  { label: "NID", value: recipient.representativeNid },
                  { label: "Email", value: recipient.representativeEmail },
                  { label: "Telefon", value: recipient.representativePhone },
                ]}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Marrësi i pronësisë nuk u identifikua.</p>
        )}
      </WorkflowSection>

      {(transferReason?.trim() || recipient) && (
        <WorkflowSection title="Transferim pronësie" description="Kalim i përgjegjësisë te subjekti i ri">
          {transferReason?.trim() ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Arsyeja e transferimit
              </p>
              <p className="mt-1 whitespace-pre-wrap font-medium">{transferReason}</p>
            </div>
          ) : null}
        </WorkflowSection>
      )}
    </>
  );
}

export function ownershipRecipientFromApplication(input: {
  responsibleEntityName?: string | null;
  responsibleEntityIdentifier?: string | null;
  organization?: {
    name: string;
    nipt?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    representativeName?: string | null;
    representativeNid?: string | null;
    representativeEmail?: string | null;
    representativePhone?: string | null;
  } | null;
  delegationStatus?: DelegationStatus | null;
}): OwnershipRecipientSummary | null {
  const name = input.responsibleEntityName ?? input.organization?.name;
  if (!name) return null;

  return {
    name,
    nipt: input.responsibleEntityIdentifier ?? input.organization?.nipt,
    address: input.organization?.address,
    email: input.organization?.email,
    phone: input.organization?.phone,
    representativeName: input.organization?.representativeName,
    representativeNid: input.organization?.representativeNid,
    representativeEmail: input.organization?.representativeEmail,
    representativePhone: input.organization?.representativePhone,
    delegationStatus: input.delegationStatus,
  };
}

export function ownershipTransferReasonFromChanges(changes: FieldChange[]): string | null {
  const match = changes.find((c) => c.field === "responsibleEntityIdentifier");
  return match?.reason?.trim() || null;
}
