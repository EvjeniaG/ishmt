import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  LogIn,
  MessageSquareWarning,
  QrCode,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstitutionalNotice } from "@/components/shared/institutional";
import { CitizenQrLookup } from "@/components/public/citizen-qr-lookup";
import { HomePortalGuideSection } from "@/components/public/home-portal-guide-section";

const PORTAL_SERVICES = [
  {
    icon: FileCheck2,
    title: "Regjistrim & certifikim",
    description:
      "Aplikime dixhitale për regjistrimin fillestar, modernizimin dhe çregjistrimin e ashensorëve sipas Udhëzimit të ISHMT.",
  },
  {
    icon: ClipboardCheck,
    title: "Inspektime & përputhshmëri",
    description:
      "Ndjekje e inspektimeve fillestare dhe periodike, trupave OM dhe statusit të përputhshmërisë në regjistër.",
  },
  {
    icon: Wrench,
    title: "Mirëmbajtje & kontrata",
    description:
      "Menaxhim i kontratave të mirëmbajtjes, raporteve teknike dhe detyrimeve të shërbimit periodik.",
  },
  {
    icon: QrCode,
    title: "Kod QR & transparencë",
    description:
      "Identifikim publik i ashensorit përmes kodit QR dhe verifikimit të statusit nga qytetarët dhe palët e treta.",
  },
] as const;

const AUDIENCES = [
  { label: "Personi përgjegjës i ashensorit", hint: "Aplikime, dosje, detyrime" },
  { label: "Kompanitë instaluese", hint: "Të dhëna teknike & dokumentacion" },
  { label: "Trupat certifikues / OM", hint: "Certifikim & inspektim periodik" },
  { label: "Kompanitë e mirëmbajtjes", hint: "Kontrata & raporte" },
  { label: "Stafi ISHMT", hint: "Shqyrtim, miratim, mbikëqyrje" },
] as const;

export function HomePortalPage() {
  return (
    <div className="portal-canvas flex min-h-full flex-col">
      <header className="relative shrink-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-gov-header via-gov-primary to-gov-secondary text-white shadow-portal-lg">
        <div className="pointer-events-none absolute inset-0 bg-header-shine" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm sm:h-14 sm:w-14"
              aria-hidden
            >
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 sm:text-[11px]">
                Republika e Shqipërisë
              </p>
              <p className="truncate text-sm font-semibold sm:text-base">
                Inspektorati Shtetëror i Mbikeqyrjes së Tregut
              </p>
              <p className="text-xs text-white/75 sm:text-sm">ISHMT · Portali zyrtar</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              asChild
              variant="ghost"
              className="flex-1 text-white/90 hover:bg-white/10 hover:text-white sm:flex-none"
            >
              <Link href="#udhezim">
                <BookOpen className="mr-2 h-4 w-4" aria-hidden />
                Udhëzim
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="flex-1 text-white/90 hover:bg-white/10 hover:text-white sm:flex-none"
            >
              <Link href="#qytetar">
                <Eye className="mr-2 h-4 w-4" aria-hidden />
                Si qytetar
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:flex-none"
            >
              <Link href="/auth/register">
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                Regjistrohu
              </Link>
            </Button>
            <Button asChild className="flex-1 bg-white text-gov-primary shadow-md hover:bg-white/95 sm:flex-none">
              <Link href="/auth/login">
                <LogIn className="mr-2 h-4 w-4" aria-hidden />
                Hyr në sistem
              </Link>
            </Button>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-red-600 via-red-500 to-red-600/80" aria-hidden />
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="workflow-hero-glow" aria-hidden />
          <div className="workflow-hero-glow-secondary" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="portal-eyebrow">Regjistri digjital kombëtar</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gov-primary sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
                Regjistri Digjital i Ashensorëve
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Platforma zyrtare e ISHMT për regjistrimin, certifikimin, inspektimin dhe
                menaxhimin e plotë të ciklit jetësor të ashensorëve në të gjithë territorin e
                Shqipërisë.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl bg-gov-primary px-6 text-base font-semibold shadow-md shadow-gov-primary/20 hover:bg-gov-secondary"
                >
                  <Link href="/auth/login">
                    Hyr në portal
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-gov-primary/25 px-6 text-base font-semibold text-gov-primary hover:bg-gov-primary/[0.04]"
                >
                  <Link href="/auth/register">Krijo llogari si person përgjegjës</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 rounded-xl border border-emerald-600/20 bg-emerald-50 px-6 text-base font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  <Link href="#qytetar">
                    <Eye className="mr-2 h-4 w-4" aria-hidden />
                    Shiko si qytetar
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { value: "Regjistër", label: "i centralizuar kombëtar" },
                { value: "24/7", label: "akses dixhital i dosjes" },
                { value: "QR", label: "verifikim publik i statusit" },
              ].map((item) => (
                <div
                  key={item.value}
                  className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm"
                >
                  <p className="text-lg font-bold text-gov-primary">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="qytetar"
          className="scroll-mt-4 border-b border-border/60 bg-gradient-to-b from-emerald-50/50 via-card/40 to-transparent"
        >
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                <p className="portal-eyebrow text-emerald-800/80">Pa llogari · Publik</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-gov-primary md:text-[1.75rem]">
                  Shiko si qytetar
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Verifikoni statusin e ashensorit duke skanuar kodin QR, ose raportoni probleme
                  sigurie te ISHMT — pa hyrje në sistem.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
                    <span>
                      Statusi i regjistrimit, inspektimit dhe përputhshmërisë (informacion publik)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
                    <span>Raportim anonim i problemeve të sigurisë ose ashensorëve pa QR</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="portal-surface p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gov-primary/10 text-gov-primary">
                      <QrCode className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold text-gov-primary">Verifiko ashensorin</h3>
                      <p className="text-xs text-muted-foreground">Hap faqen publike të regjistrit</p>
                    </div>
                  </div>
                  <CitizenQrLookup />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/report"
                    className="portal-surface-interactive flex flex-col gap-2 p-4 no-underline"
                  >
                    <MessageSquareWarning className="h-5 w-5 text-gov-primary" aria-hidden />
                    <span className="font-semibold text-gov-primary">Raporto problem</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      Problem sigurie, mungesë QR ose ankesë
                    </span>
                  </Link>
                  <Link
                    href="/report/unregistered"
                    className="portal-surface-interactive flex flex-col gap-2 p-4 no-underline"
                  >
                    <ShieldCheck className="h-5 w-5 text-gov-primary" aria-hidden />
                    <span className="font-semibold text-gov-primary">Ashensor i paregjistruar</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      Dyshim për ashensor pa regjistrim në ISHMT
                    </span>
                  </Link>
                </div>

                <InstitutionalNotice variant="legal" title="Privatësia">
                  Të dhënat e personit përgjegjës dhe adresa e plotë e ndërtesës nuk shfaqen
                  publikisht. Raportimet e qytetarëve shqyrtohen nga ISHMT.
                </InstitutionalNotice>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="portal-page-header mb-8">
            <p className="portal-eyebrow">Shërbimet e portalit</p>
            <h2 className="portal-title mt-1">Çfarë ofron platforma</h2>
            <p className="portal-subtitle mt-2">
              Një pikë qendrore për të gjitha palët e involvruara në sigurinë dhe përputhshmërinë
              e ashensorëve.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORTAL_SERVICES.map((service) => (
              <article
                key={service.title}
                className="portal-surface-interactive group flex flex-col p-5 sm:p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gov-primary/[0.08] text-gov-primary transition-colors group-hover:bg-gov-primary group-hover:text-white">
                  <service.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="font-semibold text-gov-primary">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-gradient-to-b from-gov-surface/80 to-transparent">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
              <div>
                <p className="portal-eyebrow">Qasja në sistem</p>
                <h2 className="portal-title mt-1">Kush përdor portalin</h2>
                <p className="portal-subtitle mt-2">
                  Çdo rol ka hapësirën e vet të punës — nga aplikimi fillestar deri te
                  mbikëqyrja institucionale.
                </p>
                <div className="mt-6">
                  <InstitutionalNotice variant="info" title="Platformë zyrtare">
                    Të dhënat e regjistruara kanë vlerë administrative dhe përdoren për
                    monitorimin e përputhshmërisë ligjore të ashensorëve.
                  </InstitutionalNotice>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {AUDIENCES.map((audience) => (
                  <li
                    key={audience.label}
                    className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-sm"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gov-primary/10 text-gov-primary"
                      aria-hidden
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        {audience.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {audience.hint}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <HomePortalGuideSection />

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="overflow-hidden rounded-2xl border border-gov-primary/15 bg-gradient-to-br from-gov-primary via-gov-secondary to-gov-header p-8 text-white shadow-portal-lg sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                Filloni tani
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Hyni ose regjistrohuni për të vazhduar
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                Personat përgjegjës krijojnë aplikime regjistrimi; kompanitë e licencuara
                plotësojnë dokumentacionin teknik dhe certifikues në mënyrë dixhitale.
              </p>
            </div>
            <div className="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col xl:flex-row">
              <Button asChild size="lg" className="h-12 bg-white text-gov-primary hover:bg-white/95">
                <Link href="/auth/login">Hyr në sistem</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/auth/register">Regjistrohu</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
