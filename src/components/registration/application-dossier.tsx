"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DossierSection } from "@/lib/registration/build-dossier";
import { cn } from "@/lib/utils";

function DossierFields({ fields }: { fields: DossierSection["fields"] }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-xs text-muted-foreground">{field.label}</dt>
          <dd className="mt-0.5 break-words font-medium text-foreground">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DossierSectionBlock({
  section,
  defaultOpen = true,
  collapsible = false,
  hideEmpty = false,
}: {
  section: DossierSection;
  defaultOpen?: boolean;
  collapsible?: boolean;
  hideEmpty?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const fields = hideEmpty ? section.fields.filter((f) => f.value !== "-") : section.fields;
  if (fields.length === 0) return null;

  const head = (
    <div className="reg-dossier-section-head">
      <h3 className="reg-dossier-section-title">{section.title}</h3>
      {collapsible && (
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      )}
    </div>
  );

  if (collapsible) {
    return (
      <div className="reg-dossier-section">
        <button type="button" className="w-full text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {head}
        </button>
        {open && <DossierFields fields={fields} />}
      </div>
    );
  }

  return (
    <div className="reg-dossier-section">
      {head}
      <DossierFields fields={fields} />
    </div>
  );
}

export function ApplicationDossier({
  sections,
  hideEmpty = false,
  collapsibleSectionIds,
}: {
  sections: DossierSection[];
  workflow?: { id: string; label: string; at: string }[];
  ownerEditableSectionIds?: Set<string>;
  hideEmpty?: boolean;
  collapsibleSectionIds?: Set<string>;
}) {
  return (
    <div className="reg-dossier-block">
      {sections.map((section) => (
        <DossierSectionBlock
          key={section.id}
          section={section}
          hideEmpty={hideEmpty}
          collapsible={collapsibleSectionIds?.has(section.id)}
          defaultOpen={!collapsibleSectionIds?.has(section.id)}
        />
      ))}
    </div>
  );
}
