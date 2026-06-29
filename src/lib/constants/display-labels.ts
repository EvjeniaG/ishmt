import { ApplicationStatus, ApplicationType, CertificateStatus, CertificateType, DataUpdateType, DelegationStatus, DelegationType, ElevatorStatus } from "@prisma/client";
import { APPLICATION_TYPE_LABELS, OWNERSHIP_TRANSFER_LABEL } from "@/lib/constants/application-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";

export const ELEVATOR_STATUS_LABELS: Record<ElevatorStatus, string> = {
  PENDING_REGISTRATION: "Në pritje regjistrimi",
  PENDING_CONFIRMATION: "Në pritje konfirmimi",
  UNVERIFIED: "I paverifikuar",
  REGISTERED: "I regjistruar",
  ACTIVE: "Aktiv",
  SUSPENDED: "Pezulluar",
  UNDER_INSPECTION: "Në inspektim",
  EXPIRED_CERTIFICATION: "Certifikatë e skaduar",
  MAINTENANCE_OVERDUE: "Mirëmbajtje e vonuar",
  OUT_OF_SERVICE: "Jashtë shërbimit",
  DEREGISTERED: "I çregjistruar",
};

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  INSTALLATION: "Instalimi",
  REGISTRATION: "Regjistrimi",
  PERIODIC_INSPECTION: "Inspektim periodik",
  CONFORMITY: "Përputhshmëria",
};

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  ACTIVE: "Aktive",
  EXPIRED: "E skaduar",
  REVOKED: "E revokuar",
  SUPERSEDED: "E zëvendësuar",
};

export const DELEGATION_TYPE_LABELS: Record<DelegationType, string> = {
  INSTALLER: "Instaluesi",
  CERTIFIER: "Certifikuesi",
  MAINTENANCE: "Mirëmbajtja",
  OWNERSHIP_RECIPIENT: "Marrësi i pronësisë",
};

export const DELEGATION_STATUS_LABELS: Record<DelegationStatus, string> = {
  PENDING: "Në pritje",
  INVITED: "Ftuar",
  ACCEPTED: "Pranuar",
  REJECTED: "Refuzuar",
  REVOKED: "Anuluar",
  EXPIRED: "Skaduar",
};

export const WORKFLOW_ACTION_LABELS: Record<string, string> = {
  SAVE_BASIC_DATA: "Ruajtja e të dhënave bazë",
  ASSIGN_INSTALLER: "Caktimi i instaluesit",
  ACCEPT_DELEGATION: "Pranimi i delegimit",
  REJECT_DELEGATION: "Refuzimi i delegimit",
  COMPLETE_INSTALLER: "Përfundimi i hapës së instaluesit",
  ASSIGN_CERTIFIER: "Caktimi i certifikuesit",
  ACCEPT_CERTIFIER: "Pranimi nga certifikuesi",
  COMPLETE_CERTIFIER: "Përfundimi i certifikimit",
  CREATE: "Krijimi i aplikimit",
  SUBMIT: "Parashtrimi te ISHMT",
  PICKUP_REVIEW: "Marrja në shqyrtim",
  APPROVE: "Miratimi",
  REJECT: "Refuzimi",
  RETURN: "Kthimi për korrigjim",
  INSTALLER_DELEGATED: "Caktimi i instaluesit",
  INSTALLER_ACCEPTED: "Pranimi i ftesës nga instaluesi",
  INSTALLER_REJECTED: "Refuzimi i ftesës nga instaluesi",
  TECHNICAL_DATA_COMPLETED: "Përfundimi i të dhënave teknike",
  CERTIFIER_DELEGATED: "Caktimi i certifikuesit",
  CERTIFIER_ACCEPTED: "Pranimi i ftesës nga certifikuesi",
  CERTIFIER_REJECTED: "Refuzimi i ftesës nga certifikuesi",
  CERTIFICATION_COMPLETED: "Përfundimi i certifikimit",
  APPLICATION_SUBMITTED_TO_ISHMT: "Parashtrimi te ISHMT",
};

export function labelApplicationStatus(status: ApplicationStatus | string | null | undefined): string {
  if (!status) return "-";
  return APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status;
}

export function labelDelegationType(type: DelegationType | string | null | undefined): string {
  if (!type) return "-";
  return DELEGATION_TYPE_LABELS[type as DelegationType] ?? type;
}

export function labelElevatorStatus(status: ElevatorStatus | string | null | undefined): string {
  if (!status) return "-";
  return ELEVATOR_STATUS_LABELS[status as ElevatorStatus] ?? status;
}

export function labelCertificateType(type: CertificateType | string | null | undefined): string {
  if (!type) return "-";
  return CERTIFICATE_TYPE_LABELS[type as CertificateType] ?? type;
}

export function labelCertificateStatus(status: CertificateStatus | string | null | undefined): string {
  if (!status) return "-";
  return CERTIFICATE_STATUS_LABELS[status as CertificateStatus] ?? status;
}

export function labelDelegationStatus(status: DelegationStatus | string | null | undefined): string {
  if (!status) return "-";
  return DELEGATION_STATUS_LABELS[status as DelegationStatus] ?? status;
}

export function labelWorkflowAction(action: string | null | undefined): string {
  if (!action) return "-";
  return WORKFLOW_ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export function labelApplicationType(
  type: ApplicationType | string,
  updateType?: DataUpdateType | string | null,
): string {
  if (type === ApplicationType.DATA_UPDATE && updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
    return OWNERSHIP_TRANSFER_LABEL;
  }
  return APPLICATION_TYPE_LABELS[type as ApplicationType] ?? String(type);
}

export function formatWorkflowHistoryLine(input: {
  fromStatus?: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  action: string;
  statusLabels: Record<ApplicationStatus, string>;
}): string {
  const from = input.fromStatus ? input.statusLabels[input.fromStatus] : "-";
  const to = input.statusLabels[input.toStatus];
  const action = labelWorkflowAction(input.action);
  return `${from} → ${to} (${action})`;
}
