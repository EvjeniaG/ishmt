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

export function FieldInspectionTaskBriefing() {
  return (
    <div className="reg-wizard-panel overflow-hidden">
      <div className="border-b border-border/60 bg-muted/20 px-4 py-3.5 sm:px-5">
        <p className="text-sm font-semibold text-foreground">Si funksionon verifikimi në terren</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Hapat e detyrës nga nisja deri te regjistrimi i rezultatit.
        </p>
      </div>
      <div className="reg-wizard-body">
        <InspectorTaskList>
          <li>Konfirmoni nisjen dhe shkoni në objekt sipas udhëzimeve të caktimit.</li>
          <li>Verifikoni përputhjen e të dhënave të aplikimit me gjendjen reale në terren.</li>
          <li>Plotësoni rezultatin, ngarkoni raportin dhe ruajeni.</li>
        </InspectorTaskList>
      </div>
    </div>
  );
}
