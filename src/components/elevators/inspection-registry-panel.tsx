import type { InspectionRegistryView } from "@/lib/elevators/registry-view-models";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import { InspectionContractsSection } from "@/components/elevators/inspection-contracts-section";
import { InspectionHistoryList } from "@/components/elevators/inspection-history-list";
import { fmtDateSq } from "@/components/elevators/registry-shared";

function resultTone(item: InspectionRegistryView["items"][number]) {
  if (item.isPass) return "success" as const;
  if (item.isFail) return "danger" as const;
  return "warning" as const;
}

function overallStatus(data: InspectionRegistryView) {
  const latest = data.items[0];
  const nextOverdue = data.nextDue ? new Date(data.nextDue) < new Date() : false;
  if (nextOverdue) return { label: "Afati i kaluar", tone: "danger" as const };
  if (latest?.isFail) return { label: "Jo kalues", tone: "danger" as const };
  if (latest?.isPass) return { label: "Kalues", tone: "success" as const };
  return { label: "Në proces", tone: "warning" as const };
}

import type { DossierViewerKind } from "@/lib/elevators/dossier-viewer";

function nextDueSubtitle(data: InspectionRegistryView, audience: DossierViewerKind) {
  const nextOverdue = data.nextDue ? new Date(data.nextDue) < new Date() : false;
  if (audience === "ishmt_staff") {
    if (data.nextDue) return nextOverdue ? "Afati ka kaluar" : "Sipas regjistrit";
    return "Sipas historikut të inspektimeve";
  }
  if (nextOverdue) {
    return audience === "certifier"
      ? "Afati ka kaluar - regjistroni inspektimin"
      : "Afati ka kaluar - kontaktoni OMI-n";
  }
  if (data.intervalMonths) return `Intervali: ${data.intervalMonths} muaj`;
  return "Pa datë të planifikuar";
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
  const nextOverdue = data.nextDue ? new Date(data.nextDue) < new Date() : false;
  const status = overallStatus(data);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          compact
          label="Inspektimi i radhës"
          value={fmtDateSq(data.nextDue)}
          accent={nextOverdue ? "danger" : data.nextDue ? "success" : "warning"}
          subtitle={nextDueSubtitle(data, audience)}
        />
        <MetricCard
          compact
          label="Rezultati i fundit"
          value={latest?.resultLabel ?? "-"}
          accent={latest ? resultTone(latest) : "primary"}
          subtitle={latest ? fmtDateSq(latest.conductedDate ?? latest.scheduledDate) : "Pa inspektim"}
        />
        <MetricCard
          compact
          label="Gjendja"
          value={status.label}
          accent={status.tone}
          subtitle="Bazuar në inspektimin e fundit"
        />
        <MetricCard
          compact
          label="Total inspektime"
          value={data.items.length}
          accent="primary"
          subtitle="Historiku në regjistër"
        />
      </div>

      <SectionCard
        title="Regjistri i kontratave të inspektimit"
        subtitle={
          audience === "certifier"
            ? "Kontratat e inspektimit periodik - ngarkoni dokumentin pas pranimit"
            : "Kontratat me OMI-n - dokumenti ngarkohet nga kompania; i dukshëm për personin përgjegjës të ashensorit dhe ISHMT-n"
        }
        meta={
          <span className="portal-badge-neutral tabular-nums">{data.contracts.length} kontrata</span>
        }
      >
        <InspectionContractsSection contracts={data.contracts} />
      </SectionCard>

      <SectionCard
        title="Historiku i inspektimeve"
        subtitle="Inspektimet periodike (OMI) dhe jashtëzakonshme (ISHMT) - me dokument nga kompania/inspektori"
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
