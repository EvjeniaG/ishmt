import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OWNER_TERM, SYSTEM_NAME } from "@/lib/constants/owner-labels";
import { ROLE_CODES } from "@/lib/constants/roles";

const FAQ = [
  {
    q: "Si regjistroj një ashensor të ri?",
    a: "Shkoni te Aplikimet → Aplikim i ri → Regjistrim i ri. Plotësoni 6 hapat e wizard-it dhe dërgoni aplikimin te IQMT.",
  },
  {
    q: "Kush mund të caktohet si kompani mirëmbajtjeje?",
    a: "Vetëm kompanitë e mirëmbajtjes me status AKTIV dhe validim QKB. Personi përgjegjës nuk kërkon validim QKB.",
  },
  {
    q: "Si ngarkoj foton e vendosjes së QR?",
    a: "Hapni dosjen e ashensorit → skeda QR → ngarkoni fotografinë e vendosjes fizike të kodit QR.",
  },
  {
    q: "Çfarë bëj kur aplikimi kthehet për korrigjim?",
    a: "Hapni aplikimin e kthyer, lexoni arsyen e kthimit dhe plotësoni korrigjimet e kërkuara, pastaj ridërgoni.",
  },
  {
    q: "Si shkarkoj certifikatën?",
    a: "Nga skeda Certifikatat ose dosja e ashensorit → Certifikata → Shkarko PDF. Çdo shkarkim regjistrohet në audit.",
  },
];

export default async function OwnerHelpPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  return (
    <AppShell title="Ndihmë">
      <div className="mx-auto max-w-3xl">
        <StandardPageLayout
          eyebrow="Portali · Personi përgjegjës i ashensorit"
          title="Ndihmë"
          description="Udhëzime dhe mbështetje për përdorimin e portalit"
        >
          <SectionCard title={SYSTEM_NAME} padded>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Ky portal është i dedikuar për <strong className="text-foreground">{OWNER_TERM}</strong> -
                subjektin ligjor përgjegjës për ashensorët e regjistruar.
              </p>
              <p>
                Për mbështetje teknike: <a href="mailto:support@ishmt.gov.al" className="text-gov-primary hover:underline">support@ishmt.gov.al</a>
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Pyetje të shpeshta" padded>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-lg border p-4">
                  <p className="font-medium text-gov-primary">{item.q}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Lidhje të shpejta" padded>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/portal/applications/new" className="text-gov-primary hover:underline">Aplikim i ri</Link>
              <Link href="/portal/elevators" className="text-gov-primary hover:underline">Ashensorët e mi</Link>
              <Link href="/portal/profile" className="text-gov-primary hover:underline">Profili</Link>
              <Link href="/portal/notifications" className="text-gov-primary hover:underline">Njoftimet</Link>
            </div>
          </SectionCard>
        </StandardPageLayout>
      </div>
    </AppShell>
  );
}
