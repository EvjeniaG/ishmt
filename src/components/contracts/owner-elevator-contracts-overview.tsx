import Link from "next/link";
import { OM_INSPECTION_ORG_LABEL } from "@/lib/constants/periodic-inspection-labels";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";

type OwnerContractItem = {
  id: string;
  registryNumber: string;
  address: string;
  municipality: string;
  serviceCompany: string | null;
  contract: {
    contractNumber: string | null;
    startDate: Date;
    endDate: Date | null;
  } | null;
  hasAssignment: boolean;
};

export function OwnerElevatorContractsOverview({
  items,
  serviceType,
  emptyTitle,
  emptyDescription,
}: {
  items: OwnerContractItem[];
  serviceType: "MAINTENANCE" | "PERIODIC_INSPECTION";
  emptyTitle: string;
  emptyDescription: string;
}) {
  const isMaintenance = serviceType === "MAINTENANCE";
  const registryTab = isMaintenance ? "maintenance" : "inspections";
  const companyLabel = isMaintenance ? "Kompania e mirëmbajtjes" : OM_INSPECTION_ORG_LABEL;
  const assignLabel = isMaintenance ? "Cakto mirëmbajtës" : "Cakto OM";
  const changeLabel = isMaintenance ? "Ndrysho" : "Ndrysho OM";

  if (items.length === 0) {
    return <PortalEmptyState>{emptyTitle}</PortalEmptyState>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const hasCompany = Boolean(item.serviceCompany);
        const hasContract = Boolean(item.contract);
        const statusLabel =
          hasCompany && hasContract ? "Kontratë aktive" : hasCompany ? "Në pritje kontrate" : "Pa caktim";

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
                {statusLabel}
              </span>
            }
            padded
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{companyLabel}</p>
                <p className="break-words font-medium">{item.serviceCompany ?? "Pa caktim"}</p>
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
                  href={`/portal/elevators/${item.id}?tab=${registryTab}`}
                  className="text-sm font-medium text-gov-primary hover:underline"
                >
                  Regjistri →
                </Link>
                <Link
                  href={`/portal/elevators/${item.id}?tab=${registryTab}`}
                  className="text-sm text-muted-foreground hover:text-gov-primary hover:underline"
                >
                  {item.hasAssignment ? changeLabel : assignLabel}
                </Link>
              </div>
            </div>
          </SectionCard>
        );
      })}
      {items.every((item) => !item.serviceCompany) && (
        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
      )}
    </div>
  );
}
