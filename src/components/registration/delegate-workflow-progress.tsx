import { ApplicationStepper, type StepperItem } from "@/components/applications/application-stepper";

type DelegateStep = { label: string; done: boolean; active: boolean };

export function DelegateWorkflowProgress({
  title,
  steps,
}: {
  title: string;
  steps: DelegateStep[];
}) {
  const stepperSteps: StepperItem[] = steps.map((step) => ({
    label: step.label,
    state: step.done ? "completed" : step.active ? "active" : "upcoming",
  }));

  return <ApplicationStepper title={title} steps={stepperSteps} compact />;
}
