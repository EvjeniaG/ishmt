import { labelApplicationType } from "@/lib/constants/display-labels";
import type { ApplicationStatus, ApplicationType } from "@prisma/client";

export type ActivityRow = {
  key: string;
  companyId?: string;
  companyName: string;
  companyNipt?: string | null;
  applicationNumber: string;
  applicationType: string;
  applicationStatus: ApplicationStatus;
  applicationTypeEnum: ApplicationType;
  address: string;
  detail: string | null;
  owner: string;
  updatedAt: string;
};

export function formatDirectorateDate(value: Date) {
  return new Date(value).toLocaleString("sq-AL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ActivityApp = {
  id: string;
  applicationNumber: string;
  type: ApplicationType;
  status: ApplicationStatus;
  updatedAt: Date;
  installerOrg?: { id: string; name: string; nipt: string | null } | null;
  certifierOrg?: { id: string; name: string; nipt: string | null } | null;
  ownerOrg: { name: string };
  data?: {
    buildingAddress: string | null;
    serialNumber: string | null;
    manufacturer: string | null;
  } | null;
};

function baseRow(
  app: ActivityApp,
  company: { id?: string; name: string; nipt?: string | null },
): ActivityRow {
  return {
    key: app.id,
    companyId: company.id,
    companyName: company.name,
    companyNipt: company.nipt,
    applicationNumber: app.applicationNumber,
    applicationType: labelApplicationType(app.type),
    applicationStatus: app.status,
    applicationTypeEnum: app.type,
    address: app.data?.buildingAddress ?? "-",
    detail: null,
    owner: app.ownerOrg.name,
    updatedAt: formatDirectorateDate(app.updatedAt),
  };
}

export function mapInstallationActivity(app: ActivityApp): ActivityRow {
  return {
    ...baseRow(app, {
      id: app.installerOrg?.id,
      name: app.installerOrg?.name ?? "-",
      nipt: app.installerOrg?.nipt,
    }),
    detail: app.data?.serialNumber
      ? `Serial: ${app.data.serialNumber}${app.data.manufacturer ? ` · ${app.data.manufacturer}` : ""}`
      : null,
  };
}

export function mapCertificationActivity(app: ActivityApp): ActivityRow {
  return {
    ...baseRow(app, {
      id: app.certifierOrg?.id,
      name: app.certifierOrg?.name ?? "-",
      nipt: app.certifierOrg?.nipt,
    }),
    detail: app.data?.serialNumber ? `Serial: ${app.data.serialNumber}` : null,
  };
}
