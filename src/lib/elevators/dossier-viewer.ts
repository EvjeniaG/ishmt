import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { PERMISSIONS } from "@/lib/permissions/codes";
import {
  ELEVATOR_DOSSIER_TABS,
  type ElevatorDossierTabId,
} from "@/components/elevators/elevator-dossier-tabs";

export type DossierViewerKind =
  | "owner"
  | "installer"
  | "certifier"
  | "maintenance"
  | "ishmt_staff"
  | "other";

export function resolveDossierViewerKind(roleCode: RoleCode): DossierViewerKind {
  if (roleCode === ROLE_CODES.OWNER) return "owner";
  if (roleCode === ROLE_CODES.INSTALLER) return "installer";
  if (roleCode === ROLE_CODES.CERTIFIER) return "certifier";
  if (roleCode === ROLE_CODES.MAINTENANCE) return "maintenance";
  if (roleCode === ROLE_CODES.DIRECTORATE) return "ishmt_staff";
  if (isIshmtStaffRole(roleCode)) return "ishmt_staff";
  return "other";
}

const INSTALLER_TABS: ElevatorDossierTabId[] = [
  "technical",
  "certificate",
  "documents",
  "applications",
  "history",
];

const CERTIFIER_TABS: ElevatorDossierTabId[] = [
  "inspections",
  "maintenance",
  "technical",
  "certificate",
  "documents",
];

const MAINTENANCE_TABS: ElevatorDossierTabId[] = [
  "maintenance",
  "technical",
  "documents",
];

export function dossierTabsForViewer(kind: DossierViewerKind): ElevatorDossierTabId[] {
  switch (kind) {
    case "owner":
    case "ishmt_staff":
      return [...ELEVATOR_DOSSIER_TABS];
    case "certifier":
      return CERTIFIER_TABS;
    case "installer":
      return INSTALLER_TABS;
    case "maintenance":
      return MAINTENANCE_TABS;
    default:
      return ["summary"];
  }
}

export function defaultDossierTab(kind: DossierViewerKind): ElevatorDossierTabId {
  if (kind === "certifier") return "inspections";
  if (kind === "maintenance") return "maintenance";
  if (kind === "installer") return "technical";
  return "summary";
}
