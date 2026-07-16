"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ApplicationStatusBadge,
  WorkflowStatusChip,
} from "@/components/applications/application-status-badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import type { ApplicationStatus, ApplicationType } from "@prisma/client";
import {
  filterRequiredActionsBySeverity,
  formatRequiredActionDueDate,
  REQUIRED_ACTION_FILTER_OPTIONS,
  REQUIRED_ACTION_SEVERITY_LABELS,
  sortRequiredActions,
  type RequiredActionItem,
  type RequiredActionSeverity,
} from "@/lib/dashboard/required-actions";

function SeverityBadge({ severity }: { severity: RequiredActionSeverity }) {
  const tone =
    severity === "danger" ? "danger" : severity === "warning" ? "waiting" : "action";
  return <WorkflowStatusChip label={REQUIRED_ACTION_SEVERITY_LABELS[severity]} tone={tone} />;
}

type RequiredActionsPanelProps = {
  actions: RequiredActionItem[];
  title?: string;
  subtitle?: string;
  layout?: "table" | "list";
  /** Roli për badge statusi aplikimi në list layout. */
  statusRoleCode?: RoleCode;
};

export function RequiredActionsPanel({
  actions,
  title = "Veprime të kërkuara",
  subtitle,
  layout = "table",
  statusRoleCode = ROLE_CODES.OWNER,
}: RequiredActionsPanelProps) {
  const [priorityFilter, setPriorityFilter] = useState<"" | RequiredActionSeverity>("");

  const filteredActions = useMemo(() => {
    const sorted = sortRequiredActions(actions);
    return filterRequiredActionsBySeverity(sorted, priorityFilter);
  }, [actions, priorityFilter]);

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      padded
      meta={
        actions.length > 0 ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">Filtro sipas prioritetit</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as "" | RequiredActionSeverity)}
              className="h-8 min-w-[10.5rem] rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground"
              aria-label="Filtro sipas prioritetit"
            >
              {REQUIRED_ACTION_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : undefined
      }
    >
      {actions.length === 0 ? (
        <PortalEmptyState>Nuk ka veprime që kërkojnë vëmendje.</PortalEmptyState>
      ) : filteredActions.length === 0 ? (
        <PortalEmptyState>Nuk ka veprime për këtë prioritet.</PortalEmptyState>
      ) : (
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
          {layout === "table" ? (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th className="w-36">Prioriteti</th>
                  <th>Përshkrimi</th>
                  <th className="w-28">Afati</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.map((action) => (
                  <tr key={action.id}>
                    <td>
                      <SeverityBadge severity={action.severity} />
                    </td>
                    <td>
                      <p className="font-medium text-foreground">{action.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{action.subtitle}</p>
                    </td>
                    <td className="text-sm tabular-nums text-muted-foreground">
                      {formatRequiredActionDueDate(action.dueDate)}
                    </td>
                    <td>
                      <Link href={action.href} className="portal-table-link">
                        {action.actionLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PortalTableWrap>
          ) : (
            <div className="space-y-3">
              {filteredActions.map((action) => (
                <div key={action.id} className="portal-list-item">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={action.severity} />
                      <p className="font-medium">{action.title}</p>
                    </div>
                    {action.subtitle ? (
                      <p className="text-sm text-muted-foreground">{action.subtitle}</p>
                    ) : null}
                    {action.hint ? (
                      <p className="text-xs text-muted-foreground">{action.hint}</p>
                    ) : null}
                    {action.applicationStatus && action.applicationType ? (
                      <ApplicationStatusBadge
                        status={action.applicationStatus as ApplicationStatus}
                        type={action.applicationType as ApplicationType}
                        roleCode={statusRoleCode}
                      />
                    ) : null}
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={action.href}>{action.actionLabel}</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
