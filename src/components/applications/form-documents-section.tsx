import type { ReactNode } from "react";

export function FormDocumentsSection({
  title = "Dokumentet",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border/60 pt-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ngarkoni dokumentet e kërkuara para se të ruani ose të vazhdoni.
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
