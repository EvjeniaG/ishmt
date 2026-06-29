import type { DossierSection } from "@/lib/registration/build-dossier";

function DossierSectionBlock({ section }: { section: DossierSection }) {
  const fields = section.fields.filter((f) => f.value && f.value !== "-");
  if (fields.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{section.title}</h3>
      <dl className="workflow-data-grid">
        {fields.map((f) => (
          <div key={`${section.id}-${f.label}`} className="workflow-data-cell">
            <dt className="workflow-data-label">{f.label}</dt>
            <dd className="workflow-data-value break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DossierSectionsView({
  sections,
  title = "Të dhënat e plota të ashensorit",
  description = "Çdo fushë e plotësuar nga personi përgjegjës i ashensorit, instaluesi dhe certifikuesi",
}: {
  sections: DossierSection[];
  title?: string;
  description?: string;
}) {
  const visible = sections.filter((s) => s.fields.some((f) => f.value && f.value !== "-"));
  if (visible.length === 0) return null;

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <h2 className="workflow-section-title">{title}</h2>
        <p className="workflow-section-desc">{description}</p>
      </div>
      <div className="workflow-section-body space-y-8">
        {visible.map((section) => (
          <DossierSectionBlock key={section.id} section={section} />
        ))}
      </div>
    </section>
  );
}
