import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkflowSection({
  title,
  description,
  children,
  className,
  headerExtra,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}) {
  return (
    <section className={cn("workflow-section", className)}>
      <div className="workflow-section-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="workflow-section-title">{title}</h2>
            {description ? <p className="workflow-section-desc">{description}</p> : null}
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="workflow-section-body">{children}</div>
    </section>
  );
}

export function WorkflowSubsection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}
