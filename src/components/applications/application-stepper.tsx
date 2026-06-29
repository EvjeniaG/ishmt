import { Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepVisualState = "completed" | "active" | "waiting" | "upcoming";

export type StepperItem = {
  label: string;
  state: StepVisualState;
  hint?: string;
};

function circleClass(state: StepVisualState) {
  switch (state) {
    case "active":
      return "border-gov-primary bg-gov-primary text-white";
    case "waiting":
      return "border-amber-400 bg-amber-50 text-amber-800";
    case "completed":
      return "border-gov-success bg-gov-success text-white";
    default:
      return "border-border/80 bg-muted/40 text-muted-foreground";
  }
}

function labelClass(state: StepVisualState) {
  switch (state) {
    case "active":
      return "font-semibold text-gov-primary";
    case "waiting":
      return "font-medium text-amber-800";
    case "completed":
      return "font-medium text-foreground";
    default:
      return "text-muted-foreground";
  }
}

function StepLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-gov-primary shadow-sm" />
        Radha juaj
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        Në pritje
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-gov-success" />
        Gati
      </span>
    </div>
  );
}

function connectorClass(done: boolean) {
  return done ? "bg-gov-success/80" : "bg-border/80";
}

export function workflowStepsToStepper(
  steps: { label: string; done?: boolean; active?: boolean }[],
): StepperItem[] {
  return steps.map((step) => ({
    label: step.label.replace(/^\d+\.\s*/, ""),
    state: step.done ? "completed" : step.active ? "active" : "upcoming",
  }));
}

export function ApplicationStepper({
  title,
  steps,
  showLegend = false,
  phaseTitle,
  phaseDescription,
  compact = false,
}: {
  title?: string;
  steps: StepperItem[];
  showLegend?: boolean;
  phaseTitle?: string;
  phaseDescription?: string;
  /** Vetëm shiriti i hapave + numri i hapit - pa titull të dyfishtë. */
  compact?: boolean;
}) {
  if (steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.state === "completed").length;
  const activeIndex = steps.findIndex((s) => s.state === "active" || s.state === "waiting");
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : undefined;
  const currentStep = activeIndex >= 0 ? activeIndex + 1 : completedCount;

  if (compact) {
    return (
      <div className="workflow-panel reg-wizard-stepper">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 sm:px-5">
          <span className="text-sm font-medium text-foreground">
            {activeStep?.label ?? `Hapi ${currentStep}`}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {currentStep}/{steps.length}
          </span>
        </div>
        <StepperTrack steps={steps} />
      </div>
    );
  }

  return (
    <div className="workflow-panel reg-wizard-stepper">
      {(title || phaseTitle) && (
        <div className="reg-wizard-stepper-head">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {title && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>}
            <span className="workflow-step-counter tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
          {(phaseTitle || activeStep) && (
            <h2 className="reg-wizard-stepper-title">{phaseTitle ?? activeStep?.label}</h2>
          )}
          {phaseDescription && (
            <p className="reg-wizard-stepper-desc">{phaseDescription}</p>
          )}
        </div>
      )}

      <StepperTrack steps={steps} />

      {showLegend && (
        <div className="hidden border-t border-border/50 px-4 py-2 sm:block sm:px-5">
          <StepLegend />
        </div>
      )}
    </div>
  );
}

function StepperTrack({ steps }: { steps: StepperItem[] }) {
  return (
    <div className="reg-wizard-stepper-track portal-tab-scroll px-3 py-3 sm:px-5 sm:py-4">
      <div className="flex w-max min-w-full items-start sm:w-full">
        {steps.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          const leftDone = steps[index - 1]?.state === "completed";
          const rightDone = step.state === "completed";

          return (
            <div
              key={`${step.label}-${index}`}
              className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-1 px-0.5 sm:min-w-0"
            >
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-px flex-1 transition-colors",
                    isFirst ? "invisible" : connectorClass(leftDone),
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all sm:h-8 sm:w-8 sm:text-[11px]",
                    circleClass(step.state),
                  )}
                  title={step.label}
                >
                  {step.state === "completed" ? (
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />
                  ) : step.state === "waiting" ? (
                    <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "h-px flex-1 transition-colors",
                    isLast ? "invisible" : connectorClass(rightDone),
                  )}
                  aria-hidden
                />
              </div>
              <span
                className={cn(
                  "hidden max-w-[5.5rem] text-center text-[10px] leading-tight sm:block sm:max-w-none sm:text-[11px]",
                  labelClass(step.state),
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
