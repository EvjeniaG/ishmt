import type { ReactNode } from "react";
import { Building2, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function InstitutionalBanner({
  module,
  title,
  reference,
  icon,
}: {
  module: string;
  title: string;
  reference?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="portal-institutional-banner">
      <div className="portal-institutional-banner-seal" aria-hidden>
        {icon ?? <Building2 className="h-5 w-5" strokeWidth={1.75} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="portal-institutional-banner-module">{module}</p>
        <p className="portal-institutional-banner-title">{title}</p>
        {reference && <p className="portal-institutional-banner-ref">{reference}</p>}
      </div>
    </div>
  );
}

export function InstitutionalNotice({
  variant = "info",
  title,
  children,
  icon,
}: {
  variant?: "info" | "legal" | "warning" | "success";
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("portal-institutional-notice", `portal-institutional-notice-${variant}`)}>
      <div className="portal-institutional-notice-icon" aria-hidden>
        {icon ?? (variant === "legal" ? <Scale className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />)}
      </div>
      <div className="min-w-0 flex-1">
        {title && <p className="portal-institutional-notice-title">{title}</p>}
        <div className="portal-institutional-notice-body">{children}</div>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  meta,
  actions,
  children,
  className,
  padded = false,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("portal-surface portal-section-card overflow-hidden", className)}>
      <div className="portal-section-card-header">
        <div className="min-w-0 flex-1">
          <h2 className="portal-section-card-title">{title}</h2>
          {subtitle && <p className="portal-section-card-subtitle">{subtitle}</p>}
        </div>
        {(meta || actions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {meta}
            {actions}
          </div>
        )}
      </div>
      <div className={padded ? "p-5 sm:p-6" : undefined}>{children}</div>
    </section>
  );
}

export function DataSheet({
  items,
  columns = 2,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[];
  columns?: 2 | 3 | 4;
}) {
  const colClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <dl className={cn("portal-data-sheet", colClass)}>
      {items.map((item) => (
        <div key={item.label} className="portal-data-sheet-cell">
          <dt className="portal-data-sheet-label">{item.label}</dt>
          <dd className={cn("portal-data-sheet-value", item.mono && "portal-registry-num")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PortalTabBar<T extends string>({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="portal-tab-scroll" role="tablist" aria-label="Filtra">
      <div className="portal-tab-scroll-inner">
        {tabs.map((tab) => {
          const count = counts?.[tab.id];
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn("portal-tab-pill", isActive && "portal-tab-pill-active")}
            >
              {tab.label}
              {count != null && (
                <span className={cn("portal-tab-pill-count", isActive && "portal-tab-pill-count-active")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FormStep({
  step,
  title,
  description,
  children,
  last = false,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn("portal-form-step", !last && "portal-form-step-divider")}>
      <div className="portal-form-step-marker">
        <span className="portal-form-step-num">{step}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="portal-form-step-title">{title}</p>
          {description && <p className="portal-form-step-desc">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function OfficialTableFooter({
  total,
  label = "regjistrime",
  timestamp,
}: {
  total: number;
  label?: string;
  timestamp?: Date;
}) {
  return (
    <div className="portal-official-table-footer">
      <span>
        Gjithsej: <strong className="tabular-nums">{total}</strong> {label}
      </span>
      {timestamp && (
        <span className="text-muted-foreground">
          Përditësuar: {timestamp.toLocaleString("sq-AL")}
        </span>
      )}
    </div>
  );
}

export function RegistryNumber({ children }: { children: ReactNode }) {
  return <span className="portal-registry-num">{children}</span>;
}
