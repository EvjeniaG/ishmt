import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Scale, ShieldCheck } from "lucide-react";
import {
  INSTITUTION_ACRONYM,
  INSTITUTION_FULL_NAME,
} from "@/lib/constants/institution";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_LAST_UPDATED,
  TERMS_PAGE,
} from "@/lib/legal/terms-content";

function LegalActCard({
  citation,
  title,
  summary,
  href,
}: {
  citation: string;
  title: string;
  summary: string;
  href?: string;
}) {
  return (
    <article className="rounded-xl border border-border/70 bg-muted/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gov-primary">{citation}</p>
      <h3 className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{summary}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gov-primary hover:underline"
        >
          Lexo aktin normativ
          <span aria-hidden>↗</span>
        </a>
      ) : null}
    </article>
  );
}

export function TermsPageContent() {
  return (
    <div className="portal-canvas flex min-h-full flex-col">
      <div className="shrink-0 border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gov-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Faqja kryesore
          </Link>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Përditësuar: {TERMS_LAST_UPDATED}
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-portal">
          <div className="border-b border-border/60 bg-gradient-to-br from-gov-header via-gov-primary to-gov-secondary px-6 py-8 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Scale className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                  Republika e Shqipërisë · {INSTITUTION_ACRONYM}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {TERMS_PAGE.title}
                </h1>
                <p className="mt-2 text-sm text-white/80">{TERMS_PAGE.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-8">
            <div className="rounded-xl border border-gov-primary/15 bg-gov-surface/40 p-4 sm:p-5">
              <div className="space-y-3">
                {TERMS_PAGE.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-foreground/90">
                    {paragraph}
                  </p>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground sm:hidden">
                Përditësuar: {TERMS_LAST_UPDATED}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <BookOpen className="mb-2 h-5 w-5 text-gov-primary" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Baza ligjore
                </p>
                <p className="mt-1 text-sm">9 akte normative të cituara</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <FileText className="mb-2 h-5 w-5 text-gov-primary" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dokument zyrtar
                </p>
                <p className="mt-1 text-sm">Kushte përdorimi të platformës qeveritare</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <ShieldCheck className="mb-2 h-5 w-5 text-gov-primary" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Të dhënat
                </p>
                <p className="mt-1 text-sm">Përpunim sipas legjislacionit shqiptar</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <Scale className="mb-2 h-5 w-5 text-gov-primary" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Juridiksioni
                </p>
                <p className="mt-1 text-sm">Republika e Shqipërisë</p>
              </div>
            </div>

            <nav aria-label="Përmbajtja" className="rounded-xl border border-border/70 bg-muted/10 p-4">
              <p className="text-sm font-semibold">Përmbajtja</p>
              <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {TERMS_PAGE.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm text-gov-primary hover:underline"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="space-y-10">
              {TERMS_PAGE.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-foreground/90">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
                        {section.bullets.map((item) => (
                          <li key={item.slice(0, 48)}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {section.legalActs && (
                      <div className="grid gap-3 pt-2">
                        {section.legalActs.map((act) => (
                          <LegalActCard key={act.citation} {...act} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </article>

            <footer className="border-t border-border/60 pt-6 text-sm text-muted-foreground">
              <p>
                <strong className="font-medium text-foreground">{INSTITUTION_FULL_NAME}</strong>
                {" · "}
                {INSTITUTION_ACRONYM}
              </p>
              <p className="mt-2">
                Kontakt:{" "}
                <a href={`mailto:${TERMS_CONTACT_EMAIL}`} className="text-gov-primary hover:underline">
                  {TERMS_CONTACT_EMAIL}
                </a>
              </p>
              <p className="mt-4">
                Duke u kthyer te{" "}
                <Link href="/auth/register" className="text-gov-primary hover:underline">
                  regjistrimi
                </Link>{" "}
                ose{" "}
                <Link href="/auth/login" className="text-gov-primary hover:underline">
                  hyrja në sistem
                </Link>
                , ju konfirmoni se keni lexuar këto Terma dhe Kushte.
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
