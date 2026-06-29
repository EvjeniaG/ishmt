import {
  getOwnerWizardStepViews,
  OWNER_REGISTRATION_STEPS,
  type RegistrationPhase,
} from "@/lib/registration/phase-router";
import { ApplicationStepper, type StepperItem } from "@/components/applications/application-stepper";

export function RegistrationWizardProgress({ phase }: { phase: RegistrationPhase }) {
  const steps: StepperItem[] = getOwnerWizardStepViews(phase).map((step) => ({
    label: step.label,
    state: step.state,
    hint:
      step.delegateRole && step.state === "waiting"
        ? step.delegateRole === "INSTALLER"
          ? "Instaluesi"
          : "Certifikuesi"
        : undefined,
  }));

  return <ApplicationStepper steps={steps} compact />;
}

/** @deprecated Përdorni RegistrationWizardProgress me prop `phase`. */
export function WorkflowProgress({ phase }: { phase: RegistrationPhase; status?: never }) {
  return <RegistrationWizardProgress phase={phase} />;
}

export { OWNER_REGISTRATION_STEPS };
