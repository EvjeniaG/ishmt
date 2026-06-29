export {
  assertTransition,
  findTransition,
  APPLICATION_STATUS_LABELS,
  RETURN_TARGET_LABELS,
  type WorkflowAction,
  type TransitionRule,
} from "@/lib/workflows/application-workflow";

export {
  REGISTRATION_PHASES,
  resolveRegistrationPhase,
  registrationPhasePath,
  getCurrentStep,
  getRegistrationWizardStep,
  isOwnerRegistrationPhase,
  type RegistrationPhase,
} from "@/lib/registration/phase-router";
