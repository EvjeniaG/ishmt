import { redirect } from "next/navigation";
import { ComplianceIndicator } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { KpiStrip } from "@/components/shared/kpi-strip";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { ComplianceService } from "@/lib/services/compliance-service";
import { ReportingService } from "@/lib/services/reporting-service";
import { getAuthSession } from "@/lib/auth";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtCompliancePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) {
    redirect("/unauthorized");
  }

  const [summary, byMunicipality] = await Promise.all([
    ComplianceService.getNationalSummary(),
    ReportingService.getComplianceByMunicipality(),
  ]);

  const green = summary.byIndicator.find((i) => i.indicator === "GREEN")?._count.indicator ?? 0;
  const yellow = summary.byIndicator.find((i) => i.indicator === "YELLOW")?._count.indicator ?? 0;
  const red = summary.byIndicator.find((i) => i.indicator === "RED")?._count.indicator ?? 0;

  const greenLabel = ComplianceService.getLabel(ComplianceIndicator.GREEN);
  const yellowLabel = ComplianceService.getLabel(ComplianceIndicator.YELLOW);
  const redLabel = ComplianceService.getLabel(ComplianceIndicator.RED);

  return (
    <AppShell title="Konformiteti">
      <StandardPageLayout
        eyebrow="ISHMT · Përputhshmëria"
        title="Konformiteti kombëtar"
        description="Pamje e përgjithshme e përputhshmërisë së regjistrit kombëtar të ashensorëve sipas treguesve zyrtarë."
      >
        <KpiStrip
          columns={4}
          items={[
            { label: greenLabel, value: green },
            { label: yellowLabel, value: yellow },
            { label: redLabel, value: red, emphasis: red > 0 },
            { label: "Gjithsej", value: summary.total },
          ]}
        />

        {summary.gapCounts && (
          <KpiStrip
            columns={3}
            items={[
              { label: "Pa inspektim", value: summary.gapCounts.missingInspection, emphasis: true },
              { label: "Pa kompani mirëmbajtjeje", value: summary.gapCounts.missingMaintenanceCompany, emphasis: true },
              { label: "Pa regjistrim mirëmbajtjeje", value: summary.gapCounts.missingMaintenanceRecord, emphasis: true },
            ]}
          />
        )}

        <SectionCard
          title="Sipas bashkisë"
          subtitle="Shpërndarja e përputhshmërisë në nivel lokal"
          padded
        >
          <PortalTableWrap>
            <thead>
              <tr>
                <th>Bashkia</th>
                <th>Gjithsej</th>
                <th>{greenLabel}</th>
                <th>{yellowLabel}</th>
                <th>{redLabel}</th>
              </tr>
            </thead>
            <tbody>
              {byMunicipality.slice(0, 20).map((m) => (
                <tr key={m.code}>
                  <td>{m.name}</td>
                  <td className="tabular-nums">{m.total}</td>
                  <td className="tabular-nums">{m.green}</td>
                  <td className="tabular-nums">{m.yellow}</td>
                  <td className="tabular-nums">{m.red}</td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
          <OfficialTableFooter total={byMunicipality.length} label="bashki" />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
