import type { InspectionRegistryView } from "@/lib/elevators/registry-view-models";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import { InspectionContractsSection } from "@/components/elevators/inspection-contracts-section";
import { InspectionHistoryList } from "@/components/elevators/inspection-history-list";
import { fmtDateSq } from "@/components/elevators/registry-shared";
import type { DossierViewerKind } from "@/lib/elevators/dossier-viewer";
import {
  LAST_PERIODIC_INSPECTION_LABEL,
  PERIODIC_INSPECTION_CONTRACTS_LABEL,
  PERIODIC_INSPECTION_HISTORY_LABEL,
} from "@/lib/constants/periodic-inspection-labels";

function nextDueAccent(data: InspectionRegistryView) {
  const nextOverdue = data.nextDue ? new Date(data.nextDue) < new Date() : false;
  if (nextOverdue) return "danger" as const;
  if (data.nextDue) return "success" as const;
  return "warning" as const;
}

function nextDueSubtitle(data: InspectionRegistryView, audience: DossierViewerKind) {
  const nextOverdue = data.nextDue ? new Date(data.nextDue) < new Date() : false;
  if (audience === "ishmt_staff") {
    if (data.nextDue) return nextOverdue ? "Afati ka kaluar" : "Sipas regjistrit";
    return "Sipas historikut të inspektimeve periodike";
  }
  if (nextOverdue) {
    return audience === "certifier"
      ? "Afati ka kaluar - regjistroni inspektimin periodik"
      : "Afati ka kaluar - kontaktoni OM-n";
  }
  if (data.intervalMonths) return `Intervali: ${data.intervalMonths} muaj`;
  return "Pa datë të planifikuar";
}

function lastInspectionSubtitle(latest: InspectionRegistryView["items"][number] | undefined) {
  if (!latest) return "Pa inspektim të regjistruar";
  return latest.resultLabel;
}

export function InspectionRegistryPanel({
  data,
  audience = "owner",
  elevatorId,
}: {
  data: InspectionRegistryView;
  audience?: DossierViewerKind;
  elevatorId?: string;
}) {
  const latest = data.items[0];
  const activeContract = data.contracts.find((c) => c.isActive && c.statusLabel === "Aktive");
  const lastInspectionDate = latest?.conductedDate ?? latest?.scheduledDate ?? null;

  return (
    <div className="space-y-6">
      {data.certifierOrg && audience !== "owner" && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{data.certifierOrg.name}</span>
          {data.certifierOrg.nipt && (
            <span className="ml-2 font-mono text-xs">NIPT {data.certifierOrg.nipt}</span>
          )}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          compact
          label={LAST_PERIODIC_INSPECTION_LABEL}
          value={fmtDateSq(lastInspectionDate)}
          accent="primary"
          subtitle={lastInspectionSubtitle(latest)}
        />
        <MetricCard
          compact
          label="Afati i radhës"
          value={fmtDateSq(data.nextDue)}
          accent={nextDueAccent(data)}
          subtitle={nextDueSubtitle(data, audience)}
        />
        <MetricCard
          compact
          label="Kontrata"
          value={data.contracts.length}
          accent={activeContract ? "success" : "warning"}
          subtitle={activeContract?.contractNumber ?? "Pa kontratë aktive"}
        />
        <MetricCard
          compact
          label="Inspektime"
          value={data.items.length}
          accent="primary"
          subtitle="Historiku në regjistër"
        />
      </div>

      <SectionCard
        title={PERIODIC_INSPECTION_CONTRACTS_LABEL}
        subtitle={
          audience === "certifier"
            ? "Pranoni ftesën, pastaj ngarkoni kontratën e nënshkruar. Historiku mbetet i dukshëm për personin përgjegjës dhe IQMT-n."
            : "Kontratat me organizatën OM. Dokumenti i nënshkruar ngarkohet nga OM pas pranimit."
        }
        meta={
          <span className="portal-badge-neutral tabular-nums">
            {data.contracts.length === 1 ? "1 kontratë" : `${data.contracts.length} kontrata`}
          </span>
        }
      >
        <InspectionContractsSection contracts={data.contracts} showUploadHint={audience === "certifier"} />
      </SectionCard>

      <SectionCard
        title={PERIODIC_INSPECTION_HISTORY_LABEL}
        subtitle={
          audience === "certifier"
            ? "Inspektimet që regjistron OM pas kontratës aktive"
            : "Inspektimet periodike regjistrohen nga OM pas kontratës aktive të inspektimit periodik"
        }
        meta={
          <span className="portal-badge-neutral tabular-nums">{data.items.length} regjistrime</span>
        }
      >
        <InspectionHistoryList
          items={data.items}
          elevatorId={elevatorId}
          showOmiEnrich={audience === "certifier"}
        />
      </SectionCard>
    </div>
  );
}
