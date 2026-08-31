import { ApplicationStatus } from "@prisma/client";
import {
  ApplicationStepper,
  type StepperItem,
} from "@/components/applications/application-stepper";
import {
  buildOwnerIshmtTrackerSteps,
  getOwnerIshmtLocationLabel,
  isIshmtOwnerTrackingStatus,
} from "@/lib/ishmt/owner-ishmt-tracker";

export function ApplicationIshmtProgress({
  status,
  submittedAt,
}: {
  status: ApplicationStatus;
  submittedAt?: Date | null;
}) {
  if (!isIshmtOwnerTrackingStatus(status)) return null;

  const steps = buildOwnerIshmtTrackerSteps(status);
  const location = getOwnerIshmtLocationLabel(status);

  const stepperSteps: StepperItem[] = steps.map((step) => ({
    label: step.label,
    state:
      step.state === "completed"
        ? "completed"
        : step.state === "current"
          ? "active"
          : "upcoming",
    hint: step.description,
  }));

  const phaseDescription = submittedAt
    ? `Parashtruar më ${new Date(submittedAt).toLocaleDateString("sq-AL")}`
    : undefined;

  return (
    <ApplicationStepper
      title="Gjendja e dosjes"
      phaseTitle={location}
      phaseDescription={phaseDescription}
      steps={stepperSteps}
    />
  );
}
