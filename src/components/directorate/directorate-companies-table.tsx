import Link from "next/link";
import { OrgStatus, OrgType } from "@prisma/client";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OrgStatusBadge } from "@/components/directorate/org-status-badge";
import {
  capabilitiesFromOrg,
  capabilityLabels,
} from "@/lib/organizations/org-capabilities";

type Company = {
  id: string;
  name: string;
  type: OrgType;
  capInstall?: boolean | null;
  capMaintenance?: boolean | null;
  capOm?: boolean | null;
  status: OrgStatus;
  nipt: string | null;
  municipality: { nameSq: string } | null;
  licenses: { licenseNumber: string; expiryDate: Date; status: OrgStatus }[];
};

export function DirectorateCompaniesTable({
  companies,
  emptyMessage = "Nuk u gjet asnjë kompani.",
}: {
  companies: Company[];
  emptyMessage?: string;
}) {
  if (companies.length === 0) {
    return <PortalEmptyState>{emptyMessage}</PortalEmptyState>;
  }

  return (
    <PortalTableWrap>
      <thead>
        <tr>
          <th>Emri</th>
          <th>Funksionet</th>
          <th>NIPT</th>
          <th>Bashkia</th>
          <th>Licenca</th>
          <th>Skadimi</th>
          <th>Statusi</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {companies.map((company) => {
          const license = company.licenses[0];
          const isExpiring =
            license &&
            license.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

          return (
            <tr key={company.id}>
              <td className="font-medium">
                <Link href={`/directorate/companies/${company.id}`} className="portal-table-link">
                  {company.name}
                </Link>
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {capabilityLabels(capabilitiesFromOrg(company))
                    .filter((label) => label !== "Mirëmbajtje")
                    .map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </td>
              <td>{company.nipt ?? "-"}</td>
              <td>{company.municipality?.nameSq ?? "-"}</td>
              <td className="font-mono text-sm">{license?.licenseNumber ?? "-"}</td>
              <td className={isExpiring ? "font-medium text-amber-700" : ""}>
                {license ? license.expiryDate.toLocaleDateString("sq-AL") : "-"}
              </td>
              <td>
                <OrgStatusBadge status={company.status} />
              </td>
              <td className="whitespace-nowrap">
                <Link href={`/directorate/companies/${company.id}/licenses`} className="text-gov-primary hover:underline">
                  Licencat
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </PortalTableWrap>
  );
}
