import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { InstitutionalNotice, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function OwnerMaintenancePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const items = await OwnerPortalService.listMaintenance(session.user.activeOrgId);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Mirëmbajtja"
        description="Kontratat, kompania e caktuar dhe statusi i përputhshmërisë për ashensorët tuaj."
      >
        <InstitutionalNotice variant="warning" title="Kusht për caktim">
          Vetëm kompanitë e mirëmbajtjes me status <strong>AKTIV</strong> dhe <strong>QKB të validuar</strong> mund të caktohen.
        </InstitutionalNotice>

        {items.length === 0 ? (
          <PortalEmptyState>Nuk ka ashensorë aktivë.</PortalEmptyState>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const hasCompany = Boolean(item.maintenanceCompany);
              const hasContract = Boolean(item.contract);
              return (
                <SectionCard
                  key={item.id}
                  title={item.registryNumber}
                  subtitle={`${item.address} · ${item.municipality}`}
                  meta={
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        hasCompany && hasContract
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      {hasCompany && hasContract ? "Kontratë aktive" : hasCompany ? "Në pritje kontrate" : "Pa kompani"}
                    </span>
                  }
                  padded
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Kompania</p>
                      <p className="break-words font-medium">{item.maintenanceCompany ?? "Pa caktim"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nr. kontratës</p>
                      <p className="break-all font-medium sm:break-normal">{item.contract?.contractNumber ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Periudha</p>
                      <p className="font-medium">
                        {item.contract
                          ? `${new Date(item.contract.startDate).toLocaleDateString("sq-AL")} – ${
                              item.contract.endDate
                                ? new Date(item.contract.endDate).toLocaleDateString("sq-AL")
                                : "…"
                            }`
                          : "-"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                      <Link
                        href={`/portal/elevators/${item.id}?tab=maintenance`}
                        className="text-sm font-medium text-gov-primary hover:underline"
                      >
                        Regjistri →
                      </Link>
                      <Link
                        href={`/portal/elevators/${item.id}/maintenance/change`}
                        className="text-sm text-muted-foreground hover:text-gov-primary hover:underline"
                      >
                        {item.hasMaintenance ? "Ndrysho" : "Cakto"}
                      </Link>
                    </div>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}
