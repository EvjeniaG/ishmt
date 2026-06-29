import Link from "next/link";
import {
  BookOpen,
  Building2,
  ChevronRight,
  GitBranch,
  Layers,
  Users,
} from "lucide-react";
import {
  ELEVATOR_DOSSIER_GUIDE,
  ISHMT_REVIEW_FLOW,
  LIFECYCLE_APPLICATIONS,
  NEW_REGISTRATION_FULL_FLOW,
  ROLE_PLAYBOOK,
  UX_HIGHLIGHTS,
} from "@/lib/public/home-portal-guide";

function GuideAccordion({
  icon: Icon,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="portal-surface group overflow-hidden"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 transition-colors hover:bg-gov-primary/[0.03] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gov-primary/10 text-gov-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block font-semibold text-gov-primary">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-sm text-muted-foreground">{subtitle}</span>
          )}
        </span>
        <ChevronRight
          className="mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/60 px-5 pb-5 pt-4 sm:px-6">{children}</div>
    </details>
  );
}

export function HomePortalGuideSection() {
  return (
    <section id="udhezim" className="scroll-mt-4 border-t border-border/60 bg-gov-surface/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="portal-page-header mb-8">
          <p className="portal-eyebrow">Dokumentacion · UX</p>
          <h2 className="portal-title mt-1">Udhëzim i përdorimit të platformës</h2>
          <p className="portal-subtitle mt-2 max-w-3xl">
            Rrjedha e punës, rolet, llojet e aplikimeve dhe funksionalitetet e portalit — siç janë
            ndërtuar në sistem. Përdoreni si udhëzues për stafin, palët e interesuara dhe
            demonstrime.
          </p>
        </div>

        <div className="space-y-3">
          <GuideAccordion
            icon={GitBranch}
            title="Regjistrimi fillestar — rrjedha e plotë"
            subtitle="Nga aplikimi i personit përgjegjës deri te certifikata CR dhe QR"
            defaultOpen
          >
            <ol className="space-y-3">
              {NEW_REGISTRATION_FULL_FLOW.map((item) => (
                <li
                  key={`${item.step}-${item.title}`}
                  className="flex gap-4 rounded-xl border border-border/60 bg-background/80 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gov-primary text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gov-secondary">
                      {item.actor}
                    </p>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-gov-primary/15 bg-gov-primary/[0.04] p-4">
              <p className="text-sm font-semibold text-gov-primary">Shqyrtimi ISHMT (pas parashtrimit)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {ISHMT_REVIEW_FLOW.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>
          </GuideAccordion>

          <GuideAccordion
            icon={Layers}
            title="Llojet e aplikimeve (cikli jetësor)"
            subtitle="Regjistrim, ndryshime, përditësime, çregjistrim, modernizim"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {LIFECYCLE_APPLICATIONS.map((app) => (
                <article
                  key={app.key}
                  className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-gov-primary">{app.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{app.tagline}</p>
                  <p className="mt-2 text-xs font-medium text-gov-secondary">
                    Miratuesit: {app.approvers}
                  </p>
                  <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                    {app.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-3 border-t border-border/50 pt-3 text-xs text-foreground/80">
                    <span className="font-medium">Rezultati:</span> {app.outcome}
                  </p>
                </article>
              ))}
            </div>
          </GuideAccordion>

          <GuideAccordion
            icon={Users}
            title="Rolet dhe përgjegjësitë"
            subtitle="Kush hyjnë në sistem dhe çfarë bëjnë"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_PLAYBOOK.map((role) => (
                <div
                  key={role.code}
                  className="rounded-xl border border-border/70 bg-card p-4"
                >
                  <p className="font-semibold text-gov-primary">{role.label}</p>
                  <p className="text-xs text-gov-secondary">{role.portal}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{role.summary}</p>
                  <ul className="mt-3 space-y-1.5">
                    {role.actions.map((action) => (
                      <li
                        key={action}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gov-accent" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Hyrja bëhet në{" "}
              <Link href="/auth/login" className="font-medium text-gov-primary hover:underline">
                faqen e identifikimit
              </Link>{" "}
              duke zgjedhur nivelin e aksesit që përputhet me rolin tuaj.
            </p>
          </GuideAccordion>

          <GuideAccordion
            icon={Building2}
            title="Dosja e ashensorit — skedat"
            subtitle="Çfarë gjen personi përgjegjës dhe stafi ISHMT pas regjistrimit"
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ELEVATOR_DOSSIER_GUIDE.map((item) => (
                <div
                  key={item.tab}
                  className="rounded-lg border border-border/60 bg-background/60 px-3 py-3"
                >
                  <p className="text-sm font-semibold text-gov-primary">{item.tab}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Personi përgjegjës sheh edhe kartën e afateve; stafi ISHMT nuk sheh detyrimet e
              pronarit, por ka qasje të plotë në dosje për shqyrtim.
            </p>
          </GuideAccordion>

          <GuideAccordion
            icon={BookOpen}
            title="Përvoja e përdoruesit (UX) — çfarë ofron platforma"
            subtitle="Veçoritë kryesore të ndërtuara në sistem"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {UX_HIGHLIGHTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href="#qytetar" className="text-gov-primary hover:underline">
                → Hyrje publike për qytetarët
              </Link>
              <Link href="/auth/login" className="text-gov-primary hover:underline">
                → Hyr në portal
              </Link>
              <Link href="/auth/register" className="text-gov-primary hover:underline">
                → Regjistrim i ri llogarie
              </Link>
            </div>
          </GuideAccordion>
        </div>
      </div>
    </section>
  );
}
