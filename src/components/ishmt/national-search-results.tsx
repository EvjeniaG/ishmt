"use client";

import Link from "next/link";

import { ComplianceIndicatorBadge } from "@/components/shared/compliance-indicator-badge";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import type { NationalSearchElevatorRow } from "@/lib/services/ishmt-search-service";

export function NationalSearchResults({
  elevators,
  total,
  page,
}: {
  elevators: NationalSearchElevatorRow[];
  total: number;
  page: number;
}) {
  if (elevators.length === 0) {
    return <p className="text-sm text-muted-foreground">Nuk u gjet asnjë ashensor.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{total} rezultate (faqe {page})</p>
      <PortalTableWrap>
        <thead>
          <tr>
            <th>Regjistri</th>
            <th>Status</th>
            <th className="min-w-[11.5rem]">Përputhshmëria</th>
            <th>Adresa</th>
            <th>Bashkia</th>
            <th>Personi përgjegjës i ashensorit</th>
            <th>Foto QR</th>
            <th>Serial</th>
            <th className="text-right">Veprime</th>
          </tr>
        </thead>
        <tbody>
          {elevators.map((e) => (
            <tr key={e.id}>
              <td>{e.registryNumber}</td>
              <td>{labelElevatorStatus(e.status)}</td>
              <td>
                <ComplianceIndicatorBadge
                  indicator={e.compliance.indicator}
                  label={e.compliance.label}
                  title={e.complianceGaps.map((g) => g.title).join(" · ") || undefined}
                />
              </td>
              <td>{e.buildingAddress}</td>
              <td>{e.municipality.nameSq}</td>
              <td>{e.ownerOrg.name}</td>
              <td>
                {!e.hasActiveQr ? (
                  <span className="font-medium text-gov-danger">Pa QR</span>
                ) : e.hasQrPlacementPhoto ? (
                  <span className="text-green-700">Konfirmuar</span>
                ) : (
                  <span className="font-medium text-amber-800">Mungon foto</span>
                )}
              </td>
              <td>{e.technicalData?.serialNumber ?? "-"}</td>
              <td className="text-right">
                <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                  <Link href={`/portal/elevators/${e.id}`} className="portal-table-link">
                    Dosja e plotë
                  </Link>
                  <Link
                    href={`/ishmt/elevators/${e.id}`}
                    className="text-muted-foreground transition-colors hover:text-gov-primary hover:underline"
                  >
                    Kronologjia
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </PortalTableWrap>
    </div>
  );
}
