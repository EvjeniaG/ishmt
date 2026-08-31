"use client";

import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import type { FieldInspectorOptionWithWorkload } from "@/lib/ishmt/field-inspector-options";

function workloadText(inspector: FieldInspectorOptionWithWorkload) {
  const parts: string[] = [];
  if (inspector.pendingDocumentReviews > 0) {
    parts.push(`${inspector.pendingDocumentReviews} shqyrtim`);
  }
  if (inspector.pendingFieldInspections > 0) {
    parts.push(`${inspector.pendingFieldInspections} terren`);
  }
  if (parts.length === 0) return "Pa ngarkesë";
  return parts.join(" · ");
}

function InspectorRow({
  inspector,
  trailing,
  interactive = false,
}: {
  inspector: FieldInspectorOptionWithWorkload;
  trailing?: ReactNode;
  interactive?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-4">
      {trailing}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{inspector.label}</p>
        <p className="text-xs text-muted-foreground">{workloadText(inspector)}</p>
      </div>
    </div>
  );

  return (
    <li className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5">
      {interactive ? (
        <label className="block cursor-pointer">{content}</label>
      ) : (
        content
      )}
    </li>
  );
}

export function InspectorAssignedList({
  inspectors,
  assignedIds,
  showTitle = true,
}: {
  inspectors: FieldInspectorOptionWithWorkload[];
  assignedIds: string[];
  title?: string;
  showTitle?: boolean;
}) {
  const assigned = inspectors.filter((inspector) => assignedIds.includes(inspector.id));

  if (assigned.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-center">
        <UserRound className="mx-auto h-5 w-5 text-muted-foreground/70" aria-hidden />
        <p className="mt-2 text-sm text-muted-foreground">Ende nuk ka inspektorë të caktuar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showTitle ? (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {assigned.length} {assigned.length === 1 ? "inspektor" : "inspektorë"}
        </p>
      ) : null}
      <ul className="space-y-3">
        {assigned.map((inspector) => (
          <InspectorRow key={inspector.id} inspector={inspector} />
        ))}
      </ul>
    </div>
  );
}

export function InspectorSelectionList({
  inspectors,
  selected,
  onToggle,
  disabled = false,
  lockedIds = [],
  title = "Inspektorët",
}: {
  inspectors: FieldInspectorOptionWithWorkload[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  lockedIds?: string[];
  title?: string;
  hint?: string;
}) {
  if (inspectors.length === 0) {
    return <p className="text-sm text-muted-foreground">Nuk u gjetën inspektorë.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-3">
        {inspectors.map((inspector) => {
          const isLocked = lockedIds.includes(inspector.id);
          const isChecked = selected.includes(inspector.id) || isLocked;
          const rowDisabled = disabled || isLocked;

          return (
            <InspectorRow
              key={inspector.id}
              inspector={inspector}
              interactive={!rowDisabled}
              trailing={
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0"
                  checked={isChecked}
                  disabled={rowDisabled}
                  onChange={() => onToggle(inspector.id)}
                  aria-label={`Zgjidh ${inspector.label}`}
                />
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
