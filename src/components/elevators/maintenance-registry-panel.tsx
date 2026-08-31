import type { MaintenanceRegistryView } from "@/lib/elevators/registry-view-models";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import { MaintenanceContractsSection } from "@/components/elevators/maintenance-contracts-section";
import { MaintenanceRecordsList } from "@/components/elevators/maintenance-records-list";
import { fmtDateSq } from "@/components/elevators/registry-shared";

function complianceAccent(data: MaintenanceRegistryView["compliance"]) {
  if (!data) return "primary" as const;
  if (data.isCompliant) return "success" as const;
  if (data.daysOverdue > 0) return "danger" as const;
  return "warning" as const;
}

function complianceLabel(data: MaintenanceRegistryView["compliance"]) {
  if (!data) return "Pa të dhëna";
  if (data.isCompliant) return "Në përputhje";
  if (data.daysOverdue > 0) return `${data.daysOverdue} ditë vonë`;
  return "Kërkon veprim";
}

import type { DossierViewerKind } from "@/lib/elevators/dossier-viewer";

export function MaintenanceRegistryPanel({
  data,
  audience = "owner",
}: {
  data: MaintenanceRegistryView;
  audience?: DossierViewerKind;
}) {
  const activeContract = data.contracts.find((c) => c.isActive && c.statusLabel === "Aktive");
  const accent = complianceAccent(data.compliance);
  const statusLabel = complianceLabel(data.compliance);

  return (
    <div className="space-y-6">
      {data.maintenanceOrg && audience !== "owner" && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{data.maintenanceOrg.name}</span>
          {data.maintenanceOrg.nipt && (
            <span className="ml-2 font-mono text-xs">NIPT {data.maintenanceOrg.nipt}</span>
          )}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          compact
          label="Mirëmbajtja e fundit"
          value={fmtDateSq(data.compliance?.lastMaintenanceDate)}
          accent="primary"
          subtitle="Data e regjistrimit të fundit"
        />
        <MetricCard
          compact
          label="Afati i radhës"
          value={fmtDateSq(data.compliance?.nextDueDate)}
          accent={accent}
          subtitle={statusLabel}
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
          label="Ndërhyrje"
          value={data.records.length}
          accent="primary"
          subtitle="Regjistrime në kartelë"
        />
      </div>

      <SectionCard
        title="Kontratat e mirëmbajtjes"
        subtitle="Kontratat me kompaninë e mirëmbajtjes. Dokumenti i nënshkruar ngarkohet nga kompania pas pranimit."
        meta={
          <span className="portal-badge-neutral tabular-nums">
            {data.contracts.length === 1 ? "1 kontratë" : `${data.contracts.length} kontrata`}
          </span>
        }
      >
        <MaintenanceContractsSection contracts={data.contracts} showUploadHint={audience === "maintenance"} />
      </SectionCard>

      <SectionCard
        title="Regjistri i ndërhyrjeve"
        subtitle={
          audience === "maintenance"
            ? "Ndërhyrjet dhe raportet që regjistron kompania juaj"
            : "Interventet dhe raportet - çdo regjistrim ka dokument nga kompania; i dukshëm për personin përgjegjës të ashensorit dhe IQMT-n"
        }
        meta={
          <span className="portal-badge-neutral tabular-nums">{data.records.length} regjistrime</span>
        }
      >
        <MaintenanceRecordsList records={data.records} compact />
      </SectionCard>
    </div>
  );
}
