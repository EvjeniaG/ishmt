import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

const DASHBOARD_CONTENT: Record<
  RoleCode,
  { title: string; description: string; items: string[] }
> = {
  [ROLE_CODES.PUBLIC]: { title: "", description: "", items: [] },
  [ROLE_CODES.OWNER]: {
    title: "Paneli i personit përgjegjës të ashensorit",
    description: "Menaxhoni aplikimet dhe ashensorët tuaj",
    items: [
      "Krijoni aplikime për regjistrim të ri",
      "Caktoni instaluesin dhe parashtroni te ISHMT",
      "Ndiqni statusin e aplikimeve",
    ],
  },
  [ROLE_CODES.INSTALLER]: {
    title: "Paneli i instaluesit",
    description: "Aplikimet e caktuara për plotësimin e të dhënave teknike",
    items: [
      "Plotësoni të dhënat teknike të aplikimeve",
      "Caktoni kompaninë certifikuese / OMI",
      "Ngarkoni dokumentacionin teknik",
    ],
  },
  [ROLE_CODES.CERTIFIER]: {
    title: "Paneli i certifikuesit / OMI",
    description: "Aplikimet e caktuara për certifikim dhe inspektim periodik",
    items: [
      "Ngarkoni certifikatën e instalimit",
      "Verifikoni dokumentacionin teknik",
      "Regjistroni inspektimet periodike (OMI)",
    ],
  },
  [ROLE_CODES.MAINTENANCE]: {
    title: "Paneli i mirëmbajtjes",
    description: "Ashensorët e caktuar për mirëmbajtje",
    items: [
      "Regjistroni mirëmbajtjen periodike (Faza 3)",
      "Ndiqni statusin e përputhshmërisë",
      "Menaxhoni kontratat e mirëmbajtjes",
    ],
  },
  [ROLE_CODES.FIELD_INSPECTOR]: {
    title: "Inspektor",
    description: "Shqyrtim dosjeje aplikimi dhe inspektim në terren",
    items: [
      "Shqyrtoni dosjet e caktuara nga përgjegjësi i sektorit",
      "Dorëzoni raportin e shqyrtimit",
      "Regjistroni rezultatin e inspektimit në objekt",
    ],
  },
  [ROLE_CODES.SECTOR_HEAD]: {
    title: "Përgjegjës sektori",
    description: "Caktim inspektorësh dhe raport drejt drejtorit",
    items: [
      "Caktoni inspektorët për shqyrtim dosjeje",
      "Dërgoni raportin te drejtori i drejtorisë",
      "Menaxhoni inspektimet në terren",
    ],
  },
  [ROLE_CODES.ISHMT_DIRECTOR]: {
    title: "Drejtor i Drejtorisë",
    description: "Delegim dhe raport drejt kryeinspektorit",
    items: [
      "Delegoni te përgjegjësi i sektorit",
      "Dërgoni dosjen te kryeinspektori pas raportit",
      "Caktoni inspektim në terren",
    ],
  },
  [ROLE_CODES.INSPECTOR]: {
    title: "Paneli i inspektorit",
    description: "Radha e shqyrtimit dhe inspektimeve",
    items: [
      "Shqyrtoni aplikimet e parashtruara",
      "Miratoni ose ktheni për korrigjim",
      "Shqyrtoni dhe zgjidhni raportimet e qytetarëve",
    ],
  },
  [ROLE_CODES.CHIEF_INSPECTOR]: {
    title: "Kryeinspektor",
    description: "Miratimi final dhe mbikëqyrja e shqyrtimit",
    items: [
      "Miratoni aplikimet e shqyrtuara nga inspektorët",
      "Ktheni aplikimet për korrigjim",
      "Ndiqni radhën e miratimeve",
    ],
  },
  [ROLE_CODES.ADMIN]: {
    title: "Paneli i administratorit",
    description: "Administrim i sistemit dhe mbikëqyrje",
    items: [
      "Validoni kompanitë e mirëmbajtjes (QKB manual)",
      "Mbikëqyrni kompanitë e licencuara (lexim)",
      "Menaxhoni përdoruesit dhe konfigurimin",
    ],
  },
  [ROLE_CODES.DIRECTORATE]: {
    title: "Paneli i drejtorisë",
    description: "Regjistri i kompanive të licencuara",
    items: [
      "Menaxhoni kompanitë e instalimit",
      "Menaxhoni kompanitë OMI / certifikuese",
      "Ndiqni skadimin e licencave",
    ],
  },
};

export function RoleDashboard({
  roleCode,
  orgName,
}: {
  roleCode: RoleCode;
  orgName: string;
}) {
  const content = DASHBOARD_CONTENT[roleCode];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{content.title}</h1>
        <p className="text-muted-foreground">{content.description}</p>
        <p className="mt-1 text-sm">Organizata aktive: <strong>{orgName}</strong></p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Veprimet e disponueshme</CardTitle>
          <CardDescription>Faza 3 - aplikimet dhe workflow i regjistrimit</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {content.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
