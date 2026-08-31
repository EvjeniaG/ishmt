import Link from "next/link";
import { ArrowLeft, BookOpen, Scale } from "lucide-react";
import {
  INSTITUTION_ACRONYM,
  INSTITUTION_FULL_NAME,
  INSTITUTION_REGISTRY_TITLE,
} from "@/lib/constants/institution";
import { LEGAL_BASIS_ACTS, TERMS_LAST_UPDATED } from "@/lib/legal/terms-content";

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

export function LegalFrameworkPageContent() {
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
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Baza ligjore</h1>
                <p className="mt-2 text-sm text-white/80">{INSTITUTION_REGISTRY_TITLE}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-8">
            <div className="rounded-xl border border-gov-primary/15 bg-gov-surface/40 p-4 sm:p-5">
              <p className="text-sm leading-relaxed text-foreground/90">
                {INSTITUTION_FULL_NAME} ({INSTITUTION_ACRONYM}) administron Regjistrin Digjital të
                Ashensorëve në kuadër të kompetencave të mbikëqyrjes së tregut. Aktet normative më
                poshtë formojnë bazën ligjore të regjistrimit, inspektimit dhe certifikimit të
                ashensorëve si produkte joushqimore të vëna në shërbim.
              </p>
              <p className="mt-3 text-xs text-muted-foreground sm:hidden">
                Përditësuar: {TERMS_LAST_UPDATED}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="h-5 w-5 text-gov-primary" aria-hidden />
              {LEGAL_BASIS_ACTS.length} akte normative
            </div>

            <div className="grid gap-3">
              {LEGAL_BASIS_ACTS.map((act) => (
                <LegalActCard key={act.citation} {...act} />
              ))}
            </div>

            <footer className="border-t border-border/60 pt-6 text-sm text-muted-foreground">
              <p>
                Për termat e përdorimit të platformës, shiko{" "}
                <Link href="/termat-dhe-kushtet" className="text-gov-primary hover:underline">
                  Termat dhe Kushtet
                </Link>
                .
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
