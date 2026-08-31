import { SectionCard } from "@/components/shared/institutional";
import {
  getRegistrationDocumentSpecsByPhase,
} from "@/lib/documents/application-document-checklist";
import { ELEVATOR_CONDITION_DOC_NOTE } from "@/lib/documents/service-provider-document-requirements";

export function OwnerDocumentGuide() {
  const items = getRegistrationDocumentSpecsByPhase("owner", {
    registrationExtendedData: { elevatorConditionType: "NEW" },
  });

  return (
    <SectionCard title="Dokumentacioni i regjistrimit" padded>
      <p className="mb-4 text-sm text-muted-foreground">
        Formulari i regjistrimit (Aneksi 1) plotësohet në sistem - nuk kërkohet ngarkim skedari.{" "}
        {ELEVATOR_CONDITION_DOC_NOTE}
      </p>
      <ul className="space-y-2">
        {items.map((spec) => (
          <li key={spec.purpose} className="rounded-md border border-border/70 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">
              {spec.label}
              {spec.required && <span className="text-amber-600"> *</span>}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{spec.reason}</p>
          </li>
        ))}
        <li className="rounded-md border border-border/70 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Dokumente shtesë (opsionale)</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Material mbështetës që nuk është në listën e detyrueshme.
          </p>
        </li>
      </ul>
    </SectionCard>
  );
}
