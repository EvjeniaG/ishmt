import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  ClipboardCheck,
  ExternalLink,
  FileText,
  MapPin,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ContractResponseButtons } from "@/components/maintenance/contract-response-buttons";
import { ContractStatusBadge } from "@/components/maintenance/contract-status-badge";
import { KpiStrip } from "@/components/shared/kpi-strip";
import { SectionCard } from "@/components/shared/institutional";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import {
  CONTRACT_SERVICE_TYPE_LABELS,
  MaintenanceContractService,
} from "@/lib/services/maintenance-contract-service";
import { ROLE_CODES } from "@/lib/constants/roles";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("sq-AL") : "-";
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / MS_PER_DAY);
}

function ServiceTypePill({ serviceType }: { serviceType: string }) {
  const isInspection = serviceType === "PERIODIC_INSPECTION";
  const Icon = isInspection ? ClipboardCheck : Wrench;
  const classes = isInspection
    ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
    : "bg-sky-50 text-sky-700 ring-sky-600/20";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      <Icon className="h-3 w-3" />
      {CONTRACT_SERVICE_TYPE_LABELS[serviceType] ?? serviceType}
    </span>
  );
}

function dossierTabForService(serviceType: string) {
  return serviceType === "PERIODIC_INSPECTION" ? "inspections" : "maintenance";
}

export default async function OmiKontratatPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.CERTIFIER) redirect("/unauthorized");

  const ctx = await requireAuthForPage();

  await MaintenanceContractService.expireOverdue();

  const [pendingMaintenance, pendingInspection, allContracts] = await Promise.all([
    MaintenanceWorkService.listPendingContracts(ctx),
    CertifierInspectionService.listPendingContracts(ctx),
    db.maintenanceContract.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        serviceType: { in: ["MAINTENANCE", "PERIODIC_INSPECTION"] },
      },
      include: {
        elevator: { include: { municipality: true, ownerOrg: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const pending = [...pendingMaintenance, ...pendingInspection].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const decorated = allContracts.map((c) => ({
    contract: c,
    effectiveStatus: MaintenanceContractService.effectiveStatus(c),
    expiresInDays: daysUntil(c.endDate),
  }));

  const activeCount = decorated.filter((d) => d.effectiveStatus === "ACTIVE").length;
  const maintenanceActive = decorated.filter(
    (d) => d.effectiveStatus === "ACTIVE" && d.contract.serviceType === "MAINTENANCE",
  ).length;
  const inspectionActive = decorated.filter(
    (d) => d.effectiveStatus === "ACTIVE" && d.contract.serviceType === "PERIODIC_INSPECTION",
  ).length;
  const expiringCount = decorated.filter(
    (d) =>
      d.effectiveStatus === "ACTIVE" &&
      d.expiresInDays !== null &&
      d.expiresInDays >= 0 &&
      d.expiresInDays <= 30,
  ).length;

  return (
    <AppShell title="Kontratat aktive">
      <StandardPageLayout
        eyebrow="Portali · Certifikues / OMI"
        title="Kontratat aktive"
        description="Mirëmbajtje dhe inspektime periodike - ftesa, kontrata aktive dhe afatet"
        actions={
          <Link href="/portal/dashboard" className="text-sm text-gov-primary hover:underline">
            ← Kthehu te paneli
          </Link>
        }
      >
        <KpiStrip
          items={[
            { label: "Kontrata aktive", value: activeCount },
            {
              label: "Mirëmbajtje aktive",
              value: maintenanceActive,
              emphasis: maintenanceActive > 0,
            },
            {
              label: "Inspektim aktive",
              value: inspectionActive,
              emphasis: inspectionActive > 0,
            },
            { label: "Ftesa në pritje", value: pending.length, emphasis: pending.length > 0 },
            { label: "Skadojnë ≤ 30 ditë", value: expiringCount, emphasis: expiringCount > 0 },
          ]}
        />

        {pending.length > 0 && (
          <SectionCard
            title={`Ftesa në pritje (${pending.length})`}
            subtitle="Ngarkoni kontratën e nënshkruar dhe pranoni caktimin nga personi përgjegjës i ashensorit"
            className="border-l-4 border-l-amber-500"
            padded
          >
            <div className="space-y-3">
              {pending.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                      <p className="font-semibold">{c.elevator?.registryNumber ?? "-"}</p>
                      <ServiceTypePill serviceType={c.serviceType} />
                    </div>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {c.elevator?.buildingAddress ?? "-"}
                      {c.elevator?.municipality?.nameSq ? `, ${c.elevator.municipality.nameSq}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.contractNumber ? `Nr. ${c.contractNumber} · ` : ""}
                      {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                    </p>
                    <Link
                      href={`/portal/elevators/${c.elevatorId}?tab=${dossierTabForService(c.serviceType)}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gov-primary hover:underline"
                    >
                      Hap dosjen e ashensorit
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <ContractResponseButtons
                    contractId={c.id}
                    elevatorId={c.elevatorId}
                    mode={c.serviceType === "PERIODIC_INSPECTION" ? "certifier" : "maintenance"}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Të gjitha kontratat"
          meta={
            <span className="portal-badge-neutral tabular-nums">{allContracts.length} regjistrime</span>
          }
        >
          {allContracts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Nuk keni asnjë kontratë ende</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Kontratat e mirëmbajtjes dhe inspektimit shfaqen këtu sapo personi përgjegjës i ashensorit ju cakton si
                kompani shërbimi për një ashensor.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Ashensori</th>
                    <th className="px-4 py-3 font-medium">Personi përgjegjës i ashensorit</th>
                    <th className="px-4 py-3 font-medium">Shërbimi</th>
                    <th className="px-4 py-3 font-medium">Afati</th>
                    <th className="px-4 py-3 font-medium">Statusi</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {decorated.map(({ contract: c, effectiveStatus, expiresInDays }) => {
                    const showCountdown =
                      effectiveStatus === "ACTIVE" &&
                      expiresInDays !== null &&
                      expiresInDays >= 0 &&
                      expiresInDays <= 30;
                    return (
                      <tr
                        key={c.id}
                        className="border-b align-top transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.elevator?.registryNumber ?? "-"}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {c.elevator?.buildingAddress ?? "-"}
                          </p>
                          {c.contractNumber && (
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              {c.contractNumber}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.elevator?.ownerOrg?.name ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <ServiceTypePill serviceType={c.serviceType} />
                        </td>
                        <td className="px-4 py-3">
                          <p>
                            {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                          </p>
                          {showCountdown && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                              <CalendarClock className="h-3 w-3" />
                              {expiresInDays === 0
                                ? "Skadon sot"
                                : `Skadon për ${expiresInDays} ditë`}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ContractStatusBadge status={effectiveStatus} />
                          {effectiveStatus === "REJECTED" && c.rejectionReason && (
                            <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                              {c.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/portal/elevators/${c.elevatorId}?tab=${dossierTabForService(c.serviceType)}`}
                            className="text-sm font-medium text-gov-primary hover:underline"
                          >
                            Dosja →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
