import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import type { ActivityRow } from "@/components/directorate/directorate-activity-utils";

export function DirectorateActivityTable({
  title,
  emptyMessage,
  rows,
  moreHref,
}: {
  title: string;
  emptyMessage: string;
  rows: ActivityRow[];
  moreHref?: string;
}) {
  return (
    <SectionCard
      title={title}
      actions={
        moreHref && rows.length > 0 ? (
          <Link href={moreHref} className="text-sm text-gov-primary hover:underline">
            Shiko të gjitha →
          </Link>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <PortalEmptyState>{emptyMessage}</PortalEmptyState>
      ) : (
        <PortalTableWrap>
          <thead>
            <tr>
              <th>Kompania</th>
              <th>Aplikimi</th>
              <th>Statusi</th>
              <th>Lokacioni</th>
              <th>Përditësuar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  {row.companyId ? (
                    <Link
                      href={`/directorate/companies/${row.companyId}`}
                      className="font-medium text-gov-primary hover:underline"
                    >
                      {row.companyName}
                    </Link>
                  ) : (
                    <span className="font-medium">{row.companyName}</span>
                  )}
                  {row.companyNipt && (
                    <p className="text-xs text-muted-foreground">{row.companyNipt}</p>
                  )}
                </td>
                <td>
                  <p className="font-medium">{row.applicationNumber}</p>
                  <p className="text-xs text-muted-foreground">{row.applicationType}</p>
                  <p className="text-xs text-muted-foreground">Personi përgjegjës i ashensorit: {row.owner}</p>
                </td>
                <td>
                  <ApplicationStatusBadge
                    status={row.applicationStatus}
                    type={row.applicationTypeEnum}
                  />
                </td>
                <td>
                  <p>{row.address}</p>
                  {row.detail && <p className="text-xs text-muted-foreground">{row.detail}</p>}
                </td>
                <td className="whitespace-nowrap text-xs text-muted-foreground">{row.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </PortalTableWrap>
      )}
    </SectionCard>
  );
}
