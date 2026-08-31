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

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "Regjistrim i ri",
  UPDATE: "Përditësim",
  DELETE: "Fshirje",
  STATUS_CHANGE: "Ndryshim statusi",
  DOCUMENT_UPLOAD: "Ngarkim dokumenti",
  DOCUMENT_DOWNLOAD: "Shkarkim dokumenti",
  VIEW_SENSITIVE_RECORD: "Shikim i të dhënave",
  DOWNLOAD_DOCUMENT: "Shkarkim dokumenti",
  LOGIN: "Hyrje në sistem",
  LOGOUT: "Dalje nga sistemi",
  WORKFLOW_TRANSITION: "Kalim në proces",
  IMPORT: "Importim",
  ROLLBACK: "Kthim prapa",
  PERMISSION_DENIED: "Akses i refuzuar",
};

export function labelAuditAction(action: string | null | undefined): string {
  if (!action) return "-";
  return AUDIT_ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export const WORKFLOW_ACTION_LABELS: Record<string, string> = {
  CREATE: "Aplikimi u krijua",
  SAVE_BASIC_DATA: "Të dhënat bazë u ruajtën",
  ASSIGN_INSTALLER: "Ftesë te instaluesi",
  INSTALLER_DELEGATED: "Ftesë te instaluesi",
  ACCEPT_DELEGATION: "Ftesa u pranua",
  REJECT_DELEGATION: "Ftesa u refuzua",
  INSTALLER_ACCEPTED: "Instaluesi pranoi",
  INSTALLER_REJECTED: "Instaluesi refuzoi",
  START_TECHNICAL_DATA: "Filloi plotësimi teknik",
  COMPLETE_INSTALLER: "Të dhënat teknike u plotësuan",
  TECHNICAL_DATA_COMPLETED: "Të dhënat teknike u plotësuan",
  ASSIGN_CERTIFIER: "Ftesë te certifikuesi",
  CERTIFIER_DELEGATED: "Ftesë te certifikuesi",
  ACCEPT_CERTIFIER: "Certifikuesi pranoi",
  CERTIFIER_ACCEPTED: "Certifikuesi pranoi",
  CERTIFIER_REJECTED: "Certifikuesi refuzoi",
  START_CERTIFICATION: "Filloi certifikimi",
  INSTALLER_TECHNICAL_CORRECTIONS_REQUESTED: "Kërkuar korrigjim teknik nga certifikuesi",
  INSTALLER_TECHNICAL_RESUBMITTED: "Instaluesi dërgoi korrigjime teknike",
  COMPLETE_CERTIFIER: "Certifikimi u plotësua",
  CERTIFICATION_COMPLETED: "Certifikimi u plotësua",
  APPLICATION_SUBMITTED_TO_ISHMT: "Dorëzuar te IQMT",
  SUBMIT: "Dorëzuar te IQMT",
  CANCEL: "Aplikimi u anulua",
  PICKUP_REVIEW: "Marrë në shqyrtim",
  DELEGATE_TO_DIRECTOR: "Deleguar te Drejtori",
  DELEGATE_TO_SECTOR_HEAD: "Deleguar te Përgjegjësi",
  ASSIGN_FIELD_INSPECTORS: "Inspektorë të caktuar",
  UPDATE_PLANNED_INSPECTORS: "Inspektorët u ndryshuan",
  SUBMIT_FIELD_REPORT: "Raport i inspektorit",
  ALL_FIELD_REPORTS_COMPLETE: "Raportet u mbyllën",
  FORWARD_TO_DIRECTOR: "Dërguar te Drejtori",
  FORWARD_TO_CHIEF: "Dërguar te Kryeinspektori",
  APPROVE: "Miratuar",
  REJECT: "Refuzuar",
  RETURN: "Kthyer për korrigjim",
  RETURN_TO_INSPECTORS: "Kthyer te inspektorët",
  RETURN_TO_SECTOR_HEAD: "Kthyer te Përgjegjësi",
  RETURN_TO_DIRECTOR: "Kthyer te Drejtori",
  ELEVATOR_CREATED: "Ashensori u regjistrua",
  ASSETS_GENERATED: "Certifikata u gjenerua",
  CLOSE: "Aplikimi u mbyll",
  INSTALLER_DELEGATION_REVOKED: "Ftesa e instaluesit u tërhoq",
  CERTIFIER_DELEGATION_REVOKED: "Ftesa e certifikuesit u tërhoq",
  OWNERSHIP_DELEGATION_REVOKED: "Ftesa e transferimit u tërhoq",
  MAINTENANCE_DELEGATION_REVOKED: "Ftesa e mirëmbajtjes u tërhoq",
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
  if (WORKFLOW_ACTION_LABELS[input.action]) {
    return WORKFLOW_ACTION_LABELS[input.action];
  }
  return input.statusLabels[input.toStatus] ?? labelWorkflowAction(input.action);
}
