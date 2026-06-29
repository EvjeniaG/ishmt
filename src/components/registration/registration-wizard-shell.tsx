"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Trupi i një hapi - një panel i vetëm, pa header të dyfishtë. */
export function RegistrationWizardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("reg-wizard-body", className)}>{children}</div>;
}

/** Grid i thjeshtë fushash - një kolonë në mobile. */
export function RegistrationFieldGrid({
  children,
  columns = 1,
}: {
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn("reg-wizard-fields", columns === 2 && "reg-wizard-fields-2")}>{children}</div>
  );
}

/** Veprimet e fundit të një hapi. */
export function RegistrationStepActions({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="reg-wizard-actions">
      {hint && <p className="reg-wizard-actions-hint">{hint}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/** Select i unifikuar për formularët e wizard-it. */
export function RegistrationSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("reg-wizard-select", props.className)} />;
}
