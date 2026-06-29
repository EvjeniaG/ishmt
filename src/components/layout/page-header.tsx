import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="portal-page-header flex flex-wrap items-start justify-between gap-5">
      <div className="space-y-1.5">
        {eyebrow && <p className="portal-eyebrow">{eyebrow}</p>}
        <h1 className="portal-title">{title}</h1>
        {description && <p className="portal-subtitle">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">{actions}</div>
      )}
    </div>
  );
}
