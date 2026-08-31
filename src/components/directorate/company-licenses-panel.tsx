"use client";

import { OrgStatus } from "@prisma/client";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createLicenseAction } from "@/lib/actions/organization-actions";
import { LicenseRowActions, LicenseStatusBadge } from "@/components/directorate/license-actions";
import { MetricCard } from "@/components/shared/metric-card";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { formatDateSq } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LICENSE_TYPE_LABELS: Record<string, string> = {
  INSTALLATION: "Instalim",
  CERTIFICATION: "OM (kontroll periodik)",
};

type LicenseRow = {
  id: string;
  licenseNumber: string;
  licenseType: string;
  issuedDate: Date;
  expiryDate: Date;
  status: OrgStatus;
  scope: string | null;
};

type ActiveLicenseType = "INSTALLATION" | "CERTIFICATION";

function formatLicenseDate(date: Date) {
  return formatDateSq(date);
}

function IssueLicenseForm({
  organizationId,
  licenseType,
  title,
}: {
  organizationId: string;
  licenseType: ActiveLicenseType;
  title: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 2);
  const expiryDefault = expiry.toISOString().split("T")[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("licenseType", licenseType);
    const result = await createLicenseAction(organizationId, fd);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="licenseType" value={licenseType} />
      <p className="text-sm text-muted-foreground md:col-span-2">{title}</p>
      <div className="space-y-2">
        <Label htmlFor={`issued-${licenseType}`}>Data e lëshimit</Label>
        <Input id={`issued-${licenseType}`} name="issuedDate" type="date" defaultValue={today} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`expiry-${licenseType}`}>Data e skadimit</Label>
        <Input id={`expiry-${licenseType}`} name="expiryDate" type="date" defaultValue={expiryDefault} required />
      </div>
      {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Duke gjeneruar…" : "Gjenero licencën"}
        </Button>
      </div>
    </form>
  );
}

export function CompanyLicenseOverview({ licenses }: { licenses: LicenseRow[] }) {
  const now = new Date();

  function pickLicense(type: string) {
    const ofType = licenses.filter((license) => license.licenseType === type && license.expiryDate >= now);
    return (
      ofType.find((license) => license.status === OrgStatus.ACTIVE) ??
      ofType.find((license) => license.status === OrgStatus.SUSPENDED) ??
      null
    );
  }

  const installLicense = pickLicense("INSTALLATION");
  const omLicense = pickLicense("CERTIFICATION");

  function cardProps(license: LicenseRow | null) {
    if (!license) {
      return { value: "—", accent: "warning" as const, subtitle: "Nuk ka licencë të regjistruar" };
    }
    if (license.status === OrgStatus.ACTIVE) {
      return {
        value: license.licenseNumber,
        accent: "success" as const,
        subtitle: `Aktive · skadon ${formatLicenseDate(license.expiryDate)}`,
      };
    }
    if (license.status === OrgStatus.SUSPENDED) {
      return {
        value: license.licenseNumber,
        accent: "warning" as const,
        subtitle: `Pezulluar · skadon ${formatLicenseDate(license.expiryDate)}`,
      };
    }
    return { value: license.licenseNumber, accent: "warning" as const, subtitle: "Joaktive" };
  }

  const install = cardProps(installLicense);
  const om = cardProps(omLicense);

  return (
    <div className="portal-kpi-grid sm:grid-cols-2">
      <MetricCard
        label="Licencë instalimi"
        value={install.value}
        accent={install.accent}
        subtitle={install.subtitle}
        interactive={false}
        compact
      />
      <MetricCard
        label="Licencë OM"
        value={om.value}
        accent={om.accent}
        subtitle={om.subtitle}
        interactive={false}
        compact
      />
    </div>
  );
}

export function CompanyLicensesTable({
  licenses,
  canManage,
}: {
  licenses: LicenseRow[];
  canManage: boolean;
}) {
  const now = new Date();

  if (licenses.length === 0) {
    return <PortalEmptyState>Nuk ka licenca të regjistruara për këtë kompani.</PortalEmptyState>;
  }

  return (
    <PortalTableWrap>
      <thead>
        <tr>
          <th>Numri i licencës</th>
          <th>Funksioni</th>
          <th>Lëshimi</th>
          <th>Skadimi</th>
          <th>Statusi</th>
          {canManage && <th>Veprime</th>}
        </tr>
      </thead>
      <tbody>
        {licenses.map((license) => {
          const expiringSoon =
            license.status === OrgStatus.ACTIVE &&
            license.expiryDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;
          return (
            <tr key={license.id}>
              <td className="font-mono font-semibold text-gov-primary">{license.licenseNumber}</td>
              <td>{LICENSE_TYPE_LABELS[license.licenseType] ?? license.licenseType}</td>
              <td className="tabular-nums text-muted-foreground">{formatLicenseDate(license.issuedDate)}</td>
              <td className={expiringSoon ? "font-medium tabular-nums text-amber-700" : "tabular-nums text-muted-foreground"}>
                {formatLicenseDate(license.expiryDate)}
              </td>
              <td>
                <LicenseStatusBadge status={license.status} />
              </td>
              {canManage && (
                <td>
                  <LicenseRowActions
                    licenseId={license.id}
                    licenseNumber={license.licenseNumber}
                    status={license.status}
                    expiryDate={license.expiryDate}
                  />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </PortalTableWrap>
  );
}

export function CompanyIssueLicenseSection({
  organizationId,
  licenses,
}: {
  organizationId: string;
  licenses: LicenseRow[];
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const hasValidLicense = (type: ActiveLicenseType) =>
    licenses.some(
      (license) =>
        license.licenseType === type &&
        license.status !== OrgStatus.REVOKED &&
        license.expiryDate >= now,
    );

  const canIssueInstall = !hasValidLicense("INSTALLATION");
  const canIssueOm = !hasValidLicense("CERTIFICATION");

  if (!canIssueInstall && !canIssueOm) {
    return (
      <p className="text-sm text-muted-foreground">
        Kompania ka licenca aktive për instalim dhe OM.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!open ? (
        <>
          <p className="text-sm text-muted-foreground">
            Gjenerimi i licencës krijon numër të ri regjistri - hapni vetëm kur duhet shtuar licencë që mungon.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Hap gjenerimin e licencës
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Numri i licencës krijohet automatikisht dhe i jepet kompanisë për portalin.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Mbyll
              <ChevronUp className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-6">
            {canIssueInstall && (
              <IssueLicenseForm
                organizationId={organizationId}
                licenseType="INSTALLATION"
                title="Licencë instalimi"
              />
            )}
            {canIssueOm && (
              <IssueLicenseForm
                organizationId={organizationId}
                licenseType="CERTIFICATION"
                title="Licencë OM (kontroll periodik)"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
