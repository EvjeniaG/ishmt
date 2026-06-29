import { ModernizationType } from "@prisma/client";

export const MODERNIZATION_TYPE_LABELS: Record<ModernizationType, string> = {
  MOTOR_CHANGE: "Ndryshim motori",
  CONTROL_PANEL_CHANGE: "Ndryshim paneli kontrolli",
  CABIN_CHANGE: "Ndryshim kabine",
  SAFETY_SYSTEM_CHANGE: "Ndryshim sistemi sigurie",
  ELECTRICAL_SYSTEM_CHANGE: "Ndryshim sistemi elektrik",
  OTHER: "Tjetër",
};

export const MAINTENANCE_SERVICE_TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: "Mirëmbajtje",
  PERIODIC_INSPECTION: "Inspektim periodik",
};

export const DEREGISTRATION_REASON_LABELS: Record<string, string> = {
  PERMANENTLY_DISMANTLED: "Ashensori është çmontuar përfundimisht",
  REPLACED_BY_NEW_UNIT: "Ashensori zëvendësohet me një njësi tjetër",
  STRUCTURAL_CHANGES: "Ndryshime strukturore në objekt",
  OTHER: "Tjetër",
};
