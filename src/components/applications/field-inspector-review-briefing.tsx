import type { ReactNode } from "react";
import { WorkflowSection } from "@/components/applications/workflow-section";

function InspectorTaskList({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
      {children}
    </ol>
  );
}

export function FieldInspectorReviewBriefing({
  requiresFieldVerification,
}: {
  requiresFieldVerification: boolean;
}) {
  return (
    <WorkflowSection title="Detyra e shqyrtimit">
      <InspectorTaskList>
        <li>Shqyrtoni dokumentacionin e aplikimit dhe verifikoni përputhjen e të dhënave.</li>
        {requiresFieldVerification ? (
          <li>Kryeni verifikimin në terren te «Detyrat e mia» - secili inspektor i caktuar veç e veç.</li>
        ) : null}
        <li>Përgatisni raportin e detajuar dhe dërgojeni te përgjegjësi i sektorit.</li>
      </InspectorTaskList>
    </WorkflowSection>
  );
}

