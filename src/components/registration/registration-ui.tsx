import {
  Building2,
  ClipboardCheck,
  FileCheck2,
  Send,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RegistrationPhase } from "@/lib/registration/phase-router";

export function phaseIcon(phase: RegistrationPhase): LucideIcon {
  switch (phase) {
    case "basic-data":
      return Building2;
    case "select-installer":
    case "wait-installer":
      return Wrench;
    case "select-certifier":
    case "wait-certifier":
      return ShieldCheck;
    case "final-review":
      return Send;
    case "submitted":
    case "review":
      return ClipboardCheck;
    case "completed":
      return FileCheck2;
    default:
      return Building2;
  }
}

export function SummaryField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="workflow-data-cell">
      <dt className="workflow-data-label">{label}</dt>
      <dd className="workflow-data-value">{value ?? "-"}</dd>
    </div>
  );
}

export function SummaryGrid({ children }: { children: React.ReactNode }) {
  return <dl className="workflow-data-grid">{children}</dl>;
}

export function PhaseHeader({
  phase,
  title,
  description,
  stepNumber,
  totalSteps = 6,
}: {
  phase: RegistrationPhase;
  title: string;
  description: string;
  stepNumber?: number;
  totalSteps?: number;
}) {
  const Icon = phaseIcon(phase);

  return (
    <div className="workflow-phase-header">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gov-primary/10 text-gov-primary sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          {stepNumber != null && (
            <span className="workflow-step-badge">
              Hapi {stepNumber} nga {totalSteps}
            </span>
          )}
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function AlertPanel({
  variant,
  title,
  children,
  icon: Icon,
}: {
  variant: "warning" | "danger" | "success" | "info";
  title: string;
  children: React.ReactNode;
  icon: LucideIcon;
}) {
  const panelClass = {
    warning: "workflow-alert-warning",
    danger: "workflow-alert-danger",
    success: "workflow-alert-success",
    info: "workflow-alert-info",
  }[variant];

  const iconWrapClass = {
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-600",
    success: "bg-emerald-100 text-emerald-700",
    info: "bg-gov-primary/10 text-gov-primary",
  }[variant];

  return (
    <div className={cn("workflow-alert", panelClass)}>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconWrapClass)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
