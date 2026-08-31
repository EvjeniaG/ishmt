import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
import { ROLE_CODES } from "@/lib/constants/roles";
import type { RegistrationPhase } from "@/lib/registration/phase-router";
import { isReturnedToRole } from "@/lib/workflows/return-targets";

export type ApplicationDocumentEditContext = {
  type: ApplicationType;
  status: ApplicationStatus;
  returnToRole?: ReturnTargetRole | null;
  returnToRoles?: unknown;
};

/** Aktorët mund të ngarkojnë/fshijnë dokumente vetëm gjatë hap-it aktiv ose pas kthimit për korrigjim. */
export function canRoleEditApplicationDocuments(
  roleCode: string,
  app: ApplicationDocumentEditContext,
  registrationPhase?: RegistrationPhase | null,
): boolean {
  if (app.type === ApplicationType.NEW_REGISTRATION && registrationPhase != null) {
    switch (roleCode) {
      case ROLE_CODES.INSTALLER:
        return registrationPhase === "technical-data" || registrationPhase === "technical-reconciliation";
      case ROLE_CODES.CERTIFIER:
        return registrationPhase === "certification-data";
      case ROLE_CODES.OWNER:
        if (registrationPhase === "basic-data") return true;
        if (registrationPhase === "final-review") {
          return (
            app.status === ApplicationStatus.CERTIFICATION_COMPLETED ||
            app.status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES ||
            app.status === ApplicationStatus.PENDING_OWNER_SUBMISSION
          );
        }
        if (app.status === ApplicationStatus.DRAFT) return true;
        if (app.status === ApplicationStatus.RETURNED && isReturnedToRole(app, ReturnTargetRole.OWNER)) {
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  if (roleCode === ROLE_CODES.INSTALLER) {
    return (
      app.status === ApplicationStatus.PENDING_INSTALLER ||
      app.status === ApplicationStatus.INSTALLER_ACCEPTED ||
      app.status === ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS ||
      (app.status === ApplicationStatus.RETURNED && isReturnedToRole(app, ReturnTargetRole.INSTALLER))
    );
  }

  if (roleCode === ROLE_CODES.CERTIFIER) {
    return (
      app.status === ApplicationStatus.PENDING_CERTIFIER ||
      app.status === ApplicationStatus.CERTIFIER_ACCEPTED ||
      app.status === ApplicationStatus.CERTIFICATION_IN_PROGRESS ||
      (app.status === ApplicationStatus.RETURNED && isReturnedToRole(app, ReturnTargetRole.CERTIFIER))
    );
  }

  return (
    app.status === ApplicationStatus.DRAFT ||
    (app.status === ApplicationStatus.RETURNED && isReturnedToRole(app, ReturnTargetRole.OWNER))
  );
}
