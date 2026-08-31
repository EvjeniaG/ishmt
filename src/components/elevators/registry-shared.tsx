import type { ReactNode } from "react";
import { Download, FileText } from "lucide-react";
import { AppLink } from "@/components/shared/app-link";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import type { StatusTone } from "@/lib/registration/status-presentation";
import { cn } from "@/lib/utils";

import { formatDateSq, formatDateTimeSq } from "@/lib/format-date";

export function fmtDateSq(iso: string | null | undefined) {
  return formatDateSq(iso);
}

export function fmtDateTimeSq(iso: string | null | undefined) {
  return formatDateTimeSq(iso);
}

export function yearFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return new Date(iso).getFullYear();
}

export function buildYearFilterOptions(
  dates: Array<string | null | undefined>,
  allLabel = "Të gjitha",
): Array<{ value: string; label: string }> {
  const years = new Set<number>();
  for (const date of dates) {
    const year = yearFromIso(date);
    if (year) years.add(year);
  }
  return [
    { value: "all", label: allLabel },
    ...[...years].sort((a, b) => b - a).map((year) => ({ value: String(year), label: String(year) })),
  ];
}

export function RegistryFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border/60 bg-muted/15 px-4 py-3 sm:px-5">
      {children}
    </div>
  );
}

export function RegistryDropdownFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex min-w-[7.5rem] flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-md border border-border/70 bg-background px-2.5 text-xs font-medium text-foreground focus:border-gov-primary/40 focus:outline-none focus:ring-1 focus:ring-gov-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RegistryStat({
  label,
  value,
  tone = "default",
  compact,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  compact?: boolean;
}) {
  const toneClass = {
    default: compact ? "" : "border-border/70 bg-card",
    success: compact ? "text-emerald-700" : "border-emerald-200/80 bg-emerald-50/60",
    warning: compact ? "text-amber-800" : "border-amber-200/80 bg-amber-50/60",
    danger: compact ? "text-red-700" : "border-red-200/80 bg-red-50/60",
  }[tone];

  if (compact) {
    return (
      <div className={cn("px-3 py-2.5 text-center sm:px-4 sm:text-left", toneClass)}>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug">{value}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5", toneClass)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-foreground sm:text-base">{value}</p>
    </div>
  );
}

export function SectionBlock({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {count != null && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function RegistryEmpty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function registryFilterCountLabel(filtered: number, total: number) {
  if (filtered === total) {
    return total === 1 ? "1 kontratë" : `${total} kontrata`;
  }
  return `${filtered} nga ${total} kontrata`;
}

function contractFootnoteTone(statusLabel: string): "terminated" | "rejected" | "neutral" {
  if (statusLabel === "Të ndërprera" || statusLabel === "Përfunduar" || statusLabel === "E përfunduar")
    return "terminated";
  if (statusLabel === "Refuzuar") return "rejected";
  return "neutral";
}

export function contractToneFromLabel(input: { isActive: boolean; statusLabel: string }) {
  if (input.isActive && input.statusLabel === "Aktive") return "success" as const;
  if (input.statusLabel === "Në pritje") return "warning" as const;
  if (input.statusLabel === "Refuzuar") return "danger" as const;
  return "neutral" as const;
}

export function ContractStatusCell({
  statusLabel,
  tone,
  respondedAt,
  rejectionReason,
  termination,
}: {
  statusLabel: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  respondedAt: string | null;
  rejectionReason: string | null;
  termination?: {
    partyLabel: string;
    actorName: string | null;
    terminatedAt: string;
  } | null;
}) {
  const footnoteTone = contractFootnoteTone(statusLabel);
  const respondedPrefix =
    footnoteTone === "terminated"
      ? "Ndërprerë"
      : footnoteTone === "rejected"
        ? "Refuzuar"
        : "Përgjigjur";

  return (
    <div className="space-y-1">
      <StatusPill tone={tone}>{statusLabel}</StatusPill>
      {respondedAt && (
        <p className="text-[11px] text-muted-foreground">
          {respondedPrefix} · {fmtDateTimeSq(respondedAt)}
        </p>
      )}
      {rejectionReason && (
        <p className="max-w-[15rem] text-[11px] leading-snug text-muted-foreground" title={rejectionReason}>
          {footnoteTone === "terminated" ? "Arsyeja: " : footnoteTone === "rejected" ? "Refuzimi: " : ""}
          {rejectionReason}
        </p>
      )}
      {termination && (footnoteTone === "terminated" || footnoteTone === "rejected") ? (
        <p className="max-w-[15rem] text-[11px] leading-snug text-muted-foreground">
          {footnoteTone === "rejected" ? "Refuzoi: " : "Ndërpreu: "}
          {termination.partyLabel.replace(" (refuzim)", "")}
          {termination.actorName ? ` · ${termination.actorName}` : ""}
          {" · "}
          {fmtDateSq(termination.terminatedAt)}
        </p>
      ) : null}
    </div>
  );
}

export function ContractDocumentCell({
  documentId,
  documentName,
  pendingHint = "Pa ngarkuar",
}: {
  documentId: string | null;
  documentName?: string | null;
  pendingHint?: string;
}) {
  if (documentId) {
    return (
      <DocumentDownload
        documentId={documentId}
        label={documentName ?? "Kontrata PDF"}
        variant="link"
      />
    );
  }

  return <span className="text-xs text-muted-foreground">{pendingHint}</span>;
}

export function DocumentDownload({
  documentId,
  label = "Shkarko",
  variant = "button",
}: {
  documentId: string | null;
  label?: string;
  variant?: "button" | "icon" | "link";
}) {
  if (!documentId) {
    if (variant === "link") {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    return null;
  }

  if (variant === "link") {
    return (
      <AppLink
        href={`/api/documents/${documentId}/download`}
        className="inline-flex items-center gap-1 text-xs font-medium text-gov-primary hover:underline"
      >
        <Download className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </AppLink>
    );
  }

  if (variant === "icon") {
    return (
      <AppLink
        href={`/api/documents/${documentId}/download`}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-gov-primary transition-colors hover:border-gov-primary/30 hover:bg-gov-primary/5"
        title={label}
        aria-label={label}
      >
        <Download className="h-4 w-4" />
      </AppLink>
    );
  }

  return (
    <AppLink
      href={`/api/documents/${documentId}/download`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gov-primary/25 bg-gov-primary/5 px-3 py-2 text-sm font-medium text-gov-primary transition-colors hover:bg-gov-primary/10 sm:w-auto"
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </AppLink>
  );
}

export function DetailRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <dl className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:gap-4 sm:px-4">
          <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-36">{row.label}</dt>
          <dd className="text-sm leading-relaxed text-foreground break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const toneMap: Record<typeof tone, StatusTone> = {
    success: "done",
    warning: "waiting",
    danger: "danger",
    info: "action",
    neutral: "neutral",
  };
  return <WorkflowStatusChip label={String(children)} tone={toneMap[tone]} />;
}

export function RegistryPanelHeader({
  title,
  status,
  statusTone = "neutral",
}: {
  title: string;
  status: string;
  statusTone?: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight text-gov-primary sm:text-lg">{title}</h2>
      <StatusPill tone={statusTone}>{status}</StatusPill>
    </div>
  );
}

export function RegistryOverview({
  title,
  status,
  statusTone = "neutral",
  pipeline,
  metrics,
  footer,
  orgLine,
}: {
  title: string;
  status: string;
  statusTone?: "success" | "warning" | "danger" | "neutral";
  pipeline?: ReactNode;
  metrics: ReactNode;
  footer?: ReactNode;
  orgLine?: { name: string; nipt?: string | null };
}) {
  return (
    <div className="portal-surface overflow-hidden">
      <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <RegistryPanelHeader title={title} status={status} statusTone={statusTone} />
        {orgLine && (
          <p className="mt-1.5 truncate text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{orgLine.name}</span>
            {orgLine.nipt && <span className="ml-2 font-mono text-xs">· NIPT {orgLine.nipt}</span>}
          </p>
        )}
      </div>

      {pipeline && <div className="border-b border-border/60">{pipeline}</div>}

      <div className="grid grid-cols-2 divide-border/60 sm:grid-cols-4 sm:divide-x">{metrics}</div>

      {footer && <div className="border-t border-border/60 px-4 py-2.5 text-sm sm:px-5">{footer}</div>}
    </div>
  );
}

export function RegistryMetrics({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function RegistryPanelSection({
  title,
  count,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="workflow-section overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5 sm:px-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {count != null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        )}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function RegistryDataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">{children}</tbody>
      </table>
    </div>
  );
}
