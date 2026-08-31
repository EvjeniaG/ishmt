import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-border/80 bg-card/80 px-4 py-3 text-center backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between sm:text-left">
        <p className="text-[11px] text-muted-foreground">
          © {year} IQMT · Inspektorati Qendror i Mbikeqyrjes së Tregut · Regjistri Digjital i Ashensorëve
        </p>
        <nav
          aria-label="Lidhje ligjore"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]"
        >
          <Link href="/termat-dhe-kushtet" className="text-gov-primary hover:underline">
            Termat dhe kushtet
          </Link>
          <Link href="/udhezim" className="text-muted-foreground hover:text-foreground hover:underline">
            Udhëzim
          </Link>
        </nav>
      </div>
    </footer>
  );
}
