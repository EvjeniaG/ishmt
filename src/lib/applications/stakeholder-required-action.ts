import { ApplicationStatus, ReturnTargetRole } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  buildRegistrationPhaseInput,
  resolveRegistrationPhase,
  type RegistrationPhase,
} from "@/lib/registration/phase-router";
import { isReturnedToRole } from "@/lib/workflows/return-targets";
import { isDelegationRevokedForOrg } from "@/lib/delegation/delegation-revoked";

type ApplicationActionContext = Parameters<typeof buildRegistrationPhaseInput>[0] & {
  delegations?: Parameters<typeof isDelegationRevokedForOrg>[0];
};

const CERTIFIER_ACTION_PHASES = new Set<RegistrationPhase>([
  "certifier-accept",
  "certification-data",
  "installer-technical-review",
  "technical-reconciliation",
]);

const INSTALLER_ACTION_PHASES = new Set<RegistrationPhase>([
  "installer-accept",
  "technical-data",
  "technical-reconciliation",
]);

export function stakeholderRequiresApplicationAction(
  app: ApplicationActionContext,
  roleCode: RoleCode,
  activeOrgId: string,
): boolean {
  if (
    isDelegationRevokedForOrg(app.delegations, roleCode, activeOrgId, {
      installerOrgId: app.installerOrgId,
      certifierOrgId: app.certifierOrgId,
    })
  ) {
    return false;
  }

  if (app.status === ApplicationStatus.RETURNED) {
    if (roleCode === ROLE_CODES.OWNER) return isReturnedToRole(app, ReturnTargetRole.OWNER);
    if (roleCode === ROLE_CODES.INSTALLER) return isReturnedToRole(app, ReturnTargetRole.INSTALLER);
    if (roleCode === ROLE_CODES.CERTIFIER) return isReturnedToRole(app, ReturnTargetRole.CERTIFIER);
    return false;
  }

  const phase = resolveRegistrationPhase(buildRegistrationPhaseInput(app), roleCode);

  if (roleCode === ROLE_CODES.CERTIFIER) {
    return CERTIFIER_ACTION_PHASES.has(phase);
  }

  if (roleCode === ROLE_CODES.INSTALLER) {
    return INSTALLER_ACTION_PHASES.has(phase);
  }

  return false;
}
