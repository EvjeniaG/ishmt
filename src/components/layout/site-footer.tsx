export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-border/80 bg-card/80 px-4 py-2 text-center text-[11px] text-muted-foreground backdrop-blur-sm">
      © {year} ISHMT · Inspektorati Shtetëror i Mbikeqyrjes së Tregut · Regjistri Digjital i Ashensorëve
    </footer>
  );
}
