import type { ReactNode } from "react";
import { WorkflowSection, WorkflowSubsection } from "@/components/applications/workflow-section";

export function FormDocumentsSection({
  title = "Dokumentet",
  description,
  children,
  variant = "subsection",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  /** `section` - panel i plotë; `subsection` - brenda një seksioni tjetër */
  variant?: "section" | "subsection";
}) {
  if (variant === "section") {
    return (
      <WorkflowSection title={title} description={description}>
        {children}
      </WorkflowSection>
    );
  }

  return (
    <WorkflowSubsection title={title} description={description}>
      {children}
    </WorkflowSubsection>
  );
}
