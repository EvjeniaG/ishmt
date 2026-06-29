import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ComplianceIndicator, ElevatorStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { KpiStrip } from "@/components/shared/kpi-strip";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { ChiefGeoFilters } from "@/components/chief/chief-geo-filters";
import { ChiefMapClient } from "@/components/chief/chief-map-client";
import { getAuthSession } from "@/lib/auth";
import { ChiefGeoService, type GeoFilters } from "@/lib/services/chief-geo-service";
import { canApproveApplications } from "@/lib/permissions/ishmt-roles";

export default async function ChiefMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canApproveApplications(session.user.roleCode)) redirect("/unauthorized");

  const params = await searchParams;
  const filters: GeoFilters = {
    regionId: params.regionId || undefined,
    municipalityId: params.municipalityId || undefined,
    status: Object.values(ElevatorStatus).includes(params.status as ElevatorStatus)
      ? (params.status as ElevatorStatus)
      : undefined,
    compliance: Object.values(ComplianceIndicator).includes(params.compliance as ComplianceIndicator)
      ? (params.compliance as ComplianceIndicator)
      : undefined,
  };

  const [{ rows, totals }, filterOptions] = await Promise.all([
    ChiefGeoService.getByMunicipality(filters),
    ChiefGeoService.getFilterOptions(),
  ]);

  return (
    <AppShell title="Harta sipas bashkive">
      <StandardPageLayout
        eyebrow="ISHMT · Analiza gjeografike"
        title="Analiza gjeografike"
        description="Shpërndarja e ashensorëve dhe përputhshmëria sipas bashkive, me hartë GIS"
      >
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border bg-muted/30" />}>
          <ChiefGeoFilters regions={filterOptions.regions} municipalities={filterOptions.municipalities} />
        </Suspense>

        <KpiStrip
          columns={3}
          items={[
            { label: "Ashensorë total", value: totals.total },
            { label: "Aktivë", value: totals.active },
            { label: "Në përputhje", value: totals.green },
            { label: "Kujdes / afat", value: totals.yellow },
            { label: "Jo në përputhje", value: totals.red, emphasis: totals.red > 0 },
            { label: "Kërkojnë vëmendje", value: totals.attention, emphasis: totals.attention > 0 },
          ]}
        />

        <SectionCard
          title="Harta GIS"
          subtitle="Shpërndarja sipas vendndodhjes"
          padded
        >
          <ChiefMapClient rows={rows} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#059669" }} />
              Kryesisht në përputhje
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#d97706" }} />
              Kujdes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#dc2626" }} />
              Risk i lartë
            </span>
            <span>Madhësia e rrethit ∝ numri i ashensorëve</span>
          </div>
        </SectionCard>

        <SectionCard
          title="Të dhënat sipas bashkive"
          subtitle="Përmbledhje statistikore për filtrat e zgjedhur"
          meta={
            <span className="portal-badge-neutral tabular-nums">{rows.length} bashki</span>
          }
        >
          {rows.length === 0 ? (
            <PortalEmptyState>Nuk u gjet asnjë ashensor për filtrat e zgjedhur.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th>Bashkia</th>
                    <th>Qarku</th>
                    <th className="portal-table-num">Total</th>
                    <th className="portal-table-num">Aktivë</th>
                    <th className="portal-table-num">Në përputhje</th>
                    <th className="portal-table-num">Kujdes</th>
                    <th className="portal-table-num">Jo në përputhje</th>
                    <th className="portal-table-num">Vëmendje</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.municipalityId}>
                      <td>{row.name}</td>
                      <td className="text-muted-foreground">{row.regionName}</td>
                      <td className="portal-table-num font-semibold">{row.total}</td>
                      <td className="portal-table-num">{row.active}</td>
                      <td className="portal-table-num text-emerald-700">{row.green}</td>
                      <td className="portal-table-num text-amber-700">{row.yellow}</td>
                      <td className="portal-table-num text-red-700">{row.red}</td>
                      <td className="portal-table-num">{row.attention}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 1 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="portal-table-total-label">
                        Totali
                      </td>
                      <td className="portal-table-num">{totals.total}</td>
                      <td className="portal-table-num">{totals.active}</td>
                      <td className="portal-table-num text-emerald-700">{totals.green}</td>
                      <td className="portal-table-num text-amber-700">{totals.yellow}</td>
                      <td className="portal-table-num text-red-700">{totals.red}</td>
                      <td className="portal-table-num">{totals.attention}</td>
                    </tr>
                  </tfoot>
                )}
              </PortalTableWrap>
              <div className="portal-official-table-footer">
                <span>
                  Gjithsej: <strong className="tabular-nums">{rows.length}</strong> bashki
                  {rows.length === 1 && rows[0] && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {totals.total} ashensorë ({totals.active} aktivë, {totals.green} në përputhje)
                    </span>
                  )}
                </span>
                {rows.length > 1 && (
                  <span className="tabular-nums text-muted-foreground">
                    {totals.total} ashensorë · {totals.active} aktivë · {totals.green} në përputhje ·{" "}
                    {totals.red} jashtë përputhshmërisë
                  </span>
                )}
              </div>
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
