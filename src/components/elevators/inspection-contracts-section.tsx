"use client";

import { useMemo, useState } from "react";
import type { InspectionRegistryView } from "@/lib/elevators/registry-view-models";
import { ServiceContractRowActions } from "@/components/maintenance/service-contract-row-actions";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import {
  buildYearFilterOptions,
  ContractDocumentCell,
  ContractStatusCell,
  fmtDateSq,
  fmtDateTimeSq,
  RegistryDropdownFilter,
  RegistryFilterBar,
  registryFilterCountLabel,
  contractToneFromLabel,
} from "@/components/elevators/registry-shared";
import { cn } from "@/lib/utils";

type Contract = InspectionRegistryView["contracts"][number];

const STATUS_FILTERS = [
  { value: "all", label: "Të gjitha" },
  { value: "Aktive", label: "Aktive" },
  { value: "Në pritje", label: "Në pritje" },
  { value: "Të ndërprera", label: "Të ndërprera" },
  { value: "Skaduar", label: "Skaduar" },
  { value: "Refuzuar", label: "Refuzuar" },
] as const;

function contractTone(contract: Contract) {
  return contractToneFromLabel({
    isActive: contract.isActive,
    statusLabel: contract.statusLabel,
  });
}

export function InspectionContractsSection({
  contracts,
  elevatorId,
  showTerminateAction = false,
}: {
  contracts: Contract[];
  elevatorId?: string;
  showTerminateAction?: boolean;
}) {
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

  const documentPendingHint = showTerminateAction ? "Ngarkoni PDF-in" : "Pa ngarkuar";

  if (contracts.length === 0) {
    return (
      <PortalEmptyState>
        Nuk ka kontratë inspektimi periodik. Caktoni OM-n për këtë ashensor.
      </PortalEmptyState>
    );
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
          {registryFilterCountLabel(filtered.length, contracts.length)}
        </p>
      </RegistryFilterBar>

      {filtered.length === 0 ? (
        <PortalEmptyState>Nuk u gjet asnjë kontratë me këto filtra.</PortalEmptyState>
      ) : (
        <PortalTableWrap>
          <thead>
            <tr>
              <th>Nr. kontratës</th>
              <th>Organizata OM</th>
              <th>Statusi</th>
              <th>Periudha</th>
              <th>Dokumenti</th>
              {showTerminateAction && elevatorId ? <th className="text-right">Veprime</th> : null}
              <th className="hidden lg:table-cell">Regjistruar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contract) => (
              <tr
                key={contract.id}
                className={cn("align-top", contract === activeContract && "bg-gov-primary/[0.04]")}
              >
                <td className="font-mono text-xs font-semibold">{contract.contractNumber}</td>
                <td>
                  <p className="font-medium">{contract.companyName}</p>
                  {contract.companyNipt && (
                    <p className="text-xs text-muted-foreground">NIPT {contract.companyNipt}</p>
                  )}
                </td>
                <td>
                  <ContractStatusCell
                    statusLabel={contract.statusLabel}
                    tone={contractTone(contract)}
                    respondedAt={contract.respondedAt}
                    rejectionReason={contract.rejectionReason}
                    termination={contract.termination}
                  />
                </td>
                <td className="whitespace-nowrap text-sm">
                  {fmtDateSq(contract.startDate)} – {fmtDateSq(contract.endDate)}
                </td>
                <td>
                  <ContractDocumentCell
                    documentId={contract.documentId}
                    documentName={contract.documentName}
                    pendingHint={documentPendingHint}
                  />
                </td>
                {showTerminateAction && elevatorId ? (
                  <td className="text-right">
                    <ServiceContractRowActions
                      contractId={contract.id}
                      elevatorId={elevatorId}
                      documentId={contract.documentId}
                      effectiveStatus={contract.isActive && contract.statusLabel === "Aktive" ? "ACTIVE" : "OTHER"}
                      serviceType="PERIODIC_INSPECTION"
                      showDossierLink={false}
                      showDownloadLink={false}
                    />
                  </td>
                ) : null}
                <td className="hidden text-sm text-muted-foreground lg:table-cell">
                  {fmtDateTimeSq(contract.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </PortalTableWrap>
      )}
    </div>
  );
}
