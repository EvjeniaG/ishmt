import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  labelApplicationType,
} from "@/lib/constants/display-labels";
import { formatDateSq } from "@/lib/format-date";
import type { CompanyActivityItem } from "@/lib/services/directorate-activity-service";

function formatDateTime(value: Date) {
  const day = formatDateSq(value);
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${day}, ${hours}:${minutes}`;
}

export function DirectorateActivityList({
  items,
  returnQuery = "",
}: {
  items: CompanyActivityItem[];
  returnQuery?: string;
}) {
  if (items.length === 0) {
    return <PortalEmptyState>Nuk u gjet asnjë aktivitet për filtrat e zgjedhur.</PortalEmptyState>;
  }

  return (
    <PortalTableWrap>
      <thead>
        <tr>
          <th>Aplikimi</th>
          <th>Ashensor</th>
          <th>Lloji</th>
          <th>Statusi</th>
          <th>Pronari</th>
          <th>Instaluesi</th>
          <th>Certifikuesi / OM</th>
          <th>Bashkia</th>
          <th>Përditësuar</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((app) => {
          const elevator = app.originElevator ?? app.targetElevator;
          const dossierHref = `/directorate/activity/${app.id}${returnQuery}`;

          return (
            <tr key={app.id}>
              <td className="font-medium">
                <Link href={dossierHref} className="portal-table-link font-mono">
                  {app.applicationNumber}
                </Link>
              </td>
              <td className="font-mono text-sm text-gov-primary">
                {elevator?.registryNumber ?? "—"}
              </td>
              <td>{labelApplicationType(app.type)}</td>
              <td>
                <ApplicationStatusBadge
                  status={app.status}
                  type={app.type}
                  roleCode={ROLE_CODES.DIRECTORATE}
                />
              </td>
              <td>{app.ownerOrg.name}</td>
              <td>
                {app.installerOrg ? (
                  <Link
                    href={`/directorate/companies/${app.installerOrg.id}`}
                    className="text-gov-primary hover:underline"
                  >
                    {app.installerOrg.name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td>
                {app.certifierOrg ? (
                  <Link
                    href={`/directorate/companies/${app.certifierOrg.id}`}
                    className="text-gov-primary hover:underline"
                  >
                    {app.certifierOrg.name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td>{app.data?.municipality?.nameSq ?? "—"}</td>
              <td className="whitespace-nowrap tabular-nums text-muted-foreground">
                {formatDateTime(app.updatedAt)}
              </td>
              <td className="whitespace-nowrap">
                <Link href={dossierHref} className="text-sm font-medium text-gov-primary hover:underline">
                  Hap dosjen →
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </PortalTableWrap>
  );
}
