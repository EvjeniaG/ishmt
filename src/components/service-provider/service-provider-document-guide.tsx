import { SectionCard } from "@/components/shared/institutional";
import {
  ELEVATOR_CONDITION_DOC_NOTE,
  getServiceProviderDocumentRequirements,
} from "@/lib/documents/service-provider-document-requirements";
import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";

export function ServiceProviderDocumentGuide({ caps }: { caps: OrgCapabilities }) {
  const sections = getServiceProviderDocumentRequirements(caps);
  if (sections.length === 0) return null;

  return (
    <SectionCard title="Dokumentacioni sipas funksionit" padded>
      <p className="mb-4 text-sm text-muted-foreground">
        Lista e dokumenteve që duhet të ngarkohen në sistem - me * janë të detyrueshme.{" "}
        {ELEVATOR_CONDITION_DOC_NOTE}
      </p>
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.area}>
            <h3 className="mb-2 text-sm font-semibold text-foreground">{section.title}</h3>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-border/70 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {item.label}
                    {item.required && <span className="text-amber-600"> *</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.context}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
