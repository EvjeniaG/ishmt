import Link from "next/link";
import { OrgStatus, OrgType } from "@prisma/client";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";

const TYPE_LABELS: Record<string, string> = {
  INSTALLER: "Instalues",
  CERTIFIER: "OMI / Certifikues",
};

type Company = {
  id: string;
  name: string;
  type: OrgType;
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
          <th>Tipi</th>
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
              <td className="font-medium">{company.name}</td>
              <td>{TYPE_LABELS[company.type] ?? company.type}</td>
              <td>{company.nipt ?? "-"}</td>
              <td>{company.municipality?.nameSq ?? "-"}</td>
              <td>{license?.licenseNumber ?? "-"}</td>
              <td className={isExpiring ? "font-medium text-amber-700" : ""}>
                {license ? license.expiryDate.toLocaleDateString("sq-AL") : "-"}
              </td>
              <td>{ORG_STATUS_LABELS[company.status] ?? company.status}</td>
              <td className="whitespace-nowrap">
                <Link
                  href={`/directorate/companies/${company.id}`}
                  className="text-gov-primary hover:underline"
                >
                  Shiko
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </PortalTableWrap>
  );
}
