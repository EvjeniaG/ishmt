"use client";

import Link from "next/link";
import { useRouter } from "@/lib/navigation/use-app-router";
import type { FormEvent } from "react";
import { SectionCard } from "@/components/shared/institutional";
import {
  CONTRACT_EXPIRING_WITHIN_OPTIONS,
  CONTRACT_ISSUE_CATEGORY_OPTIONS,
  CONTRACT_ISSUE_FILTER_OPTIONS,
  CONTRACT_SEVERITY_OPTIONS,
  ISHMT_COMPLIANCE_MONITOR_PATH,
  type ContractIssueListFilters,
} from "@/lib/ishmt/contract-issue-filters";

type MunicipalityOption = { id: string; nameSq: string };

function buildHrefFromFormData(formData: FormData): string {
  const query = new URLSearchParams();

  const q = String(formData.get("q") ?? "").trim();
  const issue = String(formData.get("issue") ?? "").trim();
  const issueCategory = String(formData.get("issueCategory") ?? "").trim();
  const severity = String(formData.get("severity") ?? "").trim();
  const municipalityId = String(formData.get("municipalityId") ?? "").trim();
  const expiringWithin = String(formData.get("expiringWithin") ?? "").trim();

  if (q) query.set("q", q);
  if (issue) query.set("issue", issue);
  if (issueCategory) query.set("issueCategory", issueCategory);
  if (severity) query.set("severity", severity);
  if (municipalityId) query.set("municipalityId", municipalityId);
  if (expiringWithin) query.set("expiringWithin", expiringWithin);

  const qs = query.toString();
  return qs ? `${ISHMT_COMPLIANCE_MONITOR_PATH}?${qs}` : ISHMT_COMPLIANCE_MONITOR_PATH;
}

export function IshmtContractFiltersForm({
  filters,
  municipalities,
  embedded = false,
}: {
  filters: ContractIssueListFilters;
  municipalities: MunicipalityOption[];
  embedded?: boolean;
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildHrefFromFormData(new FormData(event.currentTarget)), { scroll: false });
  }

  const form = (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1.5 md:col-span-2 lg:col-span-3">
        <span className="text-xs font-medium text-muted-foreground">Kërko</span>
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Regjistri, adresa, pronari, NIPT, kompania…"
          className="flex h-10 rounded-md border px-3 text-sm"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Lloji i alarmit</span>
        <select
          name="issue"
          defaultValue={filters.issue ?? ""}
          className="flex h-10 rounded-md border px-3 text-sm"
        >
          {CONTRACT_ISSUE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Kategoria</span>
        <select
          name="issueCategory"
          defaultValue={filters.issueCategory ?? ""}
          className="flex h-10 rounded-md border px-3 text-sm"
        >
          {CONTRACT_ISSUE_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Prioriteti</span>
        <select
          name="severity"
          defaultValue={filters.severity ?? ""}
          className="flex h-10 rounded-md border px-3 text-sm"
        >
          {CONTRACT_SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 md:col-span-2">
        <span className="text-xs font-medium text-muted-foreground">Bashkia / qyteti</span>
        <select
          name="municipalityId"
          defaultValue={filters.municipalityId ?? ""}
          className="flex h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Të gjitha bashkitë</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nameSq}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Afati i skadimit</span>
        <select
          name="expiringWithin"
          defaultValue={filters.expiringWithin ? String(filters.expiringWithin) : ""}
          className="flex h-10 rounded-md border px-3 text-sm"
        >
          {CONTRACT_EXPIRING_WITHIN_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3">
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md bg-gov-primary px-4 text-sm font-medium text-white hover:opacity-90"
        >
          Apliko filtrat
        </button>
        <Link
          href={ISHMT_COMPLIANCE_MONITOR_PATH}
          scroll={false}
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted/50"
        >
          Pastro filtrat
        </Link>
      </div>
    </form>
  );

  if (embedded) {
    return <div className="border-b border-border/60 pb-5">{form}</div>;
  }

  return (
    <SectionCard title="Filtrat" subtitle="Zgjidhni kriteret për listën e alarmeve" padded>
      {form}
    </SectionCard>
  );
}
