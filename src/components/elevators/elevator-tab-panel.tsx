import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DossierField } from "@/lib/registration/build-dossier";
import type { ElevatorTabGroup } from "@/lib/elevators/build-tab-dossier";

function hasVisibleFields(fields: DossierField[]) {
  return fields.some((f) => f.value && f.value !== "-");
}

export function ElevatorTabPanel({ groups }: { groups: ElevatorTabGroup[] }) {
  const visible = groups.filter((g) => hasVisibleFields(g.fields));
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Nuk ka të dhëna të regjistruara për këtë seksion.</p>;
  }

  return (
    <div className="space-y-6">
      {visible.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="workflow-data-grid">
              {group.fields
                .filter((f) => f.value && f.value !== "-")
                .map((f) => (
                  <div key={`${group.title}-${f.label}`} className="workflow-data-cell">
                    <dt className="workflow-data-label">{f.label}</dt>
                    <dd className="workflow-data-value break-words">{f.value}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
