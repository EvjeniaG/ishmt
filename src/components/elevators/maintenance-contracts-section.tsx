"use client";

import { Fragment, useMemo, useState } from "react";
import type { MaintenanceRegistryView } from "@/lib/elevators/registry-view-models";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import {
  buildYearFilterOptions,
  DocumentDownload,
  fmtDateSq,
  fmtDateTimeSq,
  RegistryDropdownFilter,
  RegistryFilterBar,
  StatusPill,
} from "@/components/elevators/registry-shared";
import { cn } from "@/lib/utils";

type Contract = MaintenanceRegistryView["contracts"][number];

const STATUS_FILTERS = [
  { value: "all", label: "Të gjitha" },
  { value: "Aktive", label: "Aktive" },
  { value: "Në pritje", label: "Në pritje" },
  { value: "Përfunduar", label: "Përfunduar" },
  { value: "Skaduar", label: "Skaduar" },
  { value: "Refuzuar", label: "Refuzuar" },
] as const;

function contractTone(contract: Contract) {
  if (contract.isActive && contract.statusLabel === "Aktive") return "success" as const;
  if (contract.statusLabel === "Në pritje") return "warning" as const;
  if (contract.statusLabel === "Refuzuar") return "danger" as const;
  return "neutral" as const;
}

export function MaintenanceContractsSection({ contracts }: { contracts: Contract[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const activeContract = contracts.find((c) => c.isActive && c.statusLabel === "Aktive");
  const yearOptions = useMemo(
    () => buildYearFilterOptions(contracts.flatMap((c) => [c.startDate, c.endDate, c.createdAt])),
    [contracts],
  );

  const filtered = useMemo(() => {
    return contracts.filter((contract) => {
      if (statusFilter !== "all" && contract.statusLabel !== statusFilter) return false;
      if (yearFilter !== "all") {
        const year = Number(yearFilter);
        const startYear = new Date(contract.startDate).getFullYear();
        const endYear = contract.endDate ? new Date(contract.endDate).getFullYear() : startYear;
        if (year < startYear || year > endYear) return false;
      }
      return true;
    });
  }, [contracts, statusFilter, yearFilter]);

  if (contracts.length === 0) {
    return <PortalEmptyState>Nuk ka kontratë. Caktoni kompaninë e mirëmbajtjes.</PortalEmptyState>;
  }

  return (
    <div>
      <RegistryFilterBar>
        <RegistryDropdownFilter
          label="Statusi"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[...STATUS_FILTERS]}
        />
        <RegistryDropdownFilter
          label="Viti"
          value={yearFilter}
          onChange={setYearFilter}
          options={yearOptions}
        />
        <p className="ml-auto self-end text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {contracts.length} kontrata
        </p>
      </RegistryFilterBar>

      {filtered.length === 0 ? (
        <PortalEmptyState>Asnjë kontratë për filtrat e zgjedhur.</PortalEmptyState>
      ) : (
        <PortalTableWrap>
          <thead>
            <tr>
              <th>Nr. kontratës</th>
              <th>Kompania</th>
              <th>Statusi</th>
              <th>Periudha</th>
              <th>Dokumenti</th>
              <th className="hidden lg:table-cell">Regjistruar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contract) => (
              <Fragment key={contract.id}>
                <tr className={cn(contract === activeContract && "bg-gov-primary/[0.04]")}>
                  <td className="font-mono text-xs font-semibold">{contract.contractNumber}</td>
                  <td>
                    <p className="font-medium">{contract.companyName}</p>
                    {contract.companyNipt && (
                      <p className="text-xs text-muted-foreground">NIPT {contract.companyNipt}</p>
                    )}
                  </td>
                  <td>
                    <StatusPill tone={contractTone(contract)}>{contract.statusLabel}</StatusPill>
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {fmtDateSq(contract.startDate)} – {fmtDateSq(contract.endDate)}
                  </td>
                  <td>
                    {contract.documentId ? (
                      <DocumentDownload
                        documentId={contract.documentId}
                        label={contract.documentName ?? "PDF kontratë"}
                        variant="link"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="hidden text-sm text-muted-foreground lg:table-cell">
                    {fmtDateTimeSq(contract.createdAt)}
                  </td>
                </tr>
                {(contract.rejectionReason || contract.respondedAt) && (
                  <tr>
                    <td colSpan={6} className="bg-muted/15 px-4 py-3 text-xs">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-muted-foreground">Lloji shërbimit</dt>
                          <dd className="font-medium">{contract.serviceTypeLabel}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Përgjigjja e kompanisë</dt>
                          <dd className="font-medium">{fmtDateTimeSq(contract.respondedAt)}</dd>
                        </div>
                        {contract.rejectionReason && (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground">Arsye refuzimi</dt>
                            <dd className="font-medium">{contract.rejectionReason}</dd>
                          </div>
                        )}
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </PortalTableWrap>
      )}
    </div>
  );
}
