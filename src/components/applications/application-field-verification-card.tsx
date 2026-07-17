"use client";

import { MapPin } from "lucide-react";
import { FieldInspectionAssignmentStatus, InspectionResult } from "@prisma/client";
import { roleLabelSq } from "@/lib/permissions/ishmt-roles";
import type { RoleCode } from "@/lib/constants/roles";
import { FIELD_INSPECTION_STATUS_LABELS, INSPECTION_RESULT_LABELS } from "@/lib/ishmt/field-inspection-labels";
import Link from "next/link";

export function ApplicationFieldVerificationCard({
  status,
}: {
  status: {
    required: boolean;
    requestedBy: string | null;
    canApprove: boolean;
    assignments: {
      id: string;
      status: FieldInspectionAssignmentStatus;
      assigneeName: string;
      result: InspectionResult | null;
      conductedDate: Date | null;
    }[];
  };
}) {
  if (!status.required) return null;

  const requestedBy = status.requestedBy ? roleLabelSq(status.requestedBy as RoleCode) : null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-amber-950">Verifikim në terren i kërkuar</h3>
          <p className="mt-0.5 text-xs text-amber-900/80">
            {requestedBy
              ? `Kërkuar nga ${requestedBy}. Miratimi bllokohet deri sa inspektori të përfundojë verifikimin me rezultat pozitiv.`
              : "Miratimi bllokohet deri sa verifikimi në terren të përfundojë me rezultat pozitiv."}
          </p>
        </div>
      </div>

      {status.assignments.length === 0 ? (
        <p className="text-sm text-amber-900">
          Në pritje të caktimit të inspektorit — verifikimi aktivizohet kur përgjegjësi delegon dosjen te inspektorët.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {status.assignments.map((a) => (
            <li key={a.id} className="rounded-md border border-amber-200/80 bg-white/70 px-3 py-2">
              <p className="font-medium text-foreground">{a.assigneeName}</p>
              <p className="text-xs text-muted-foreground">
                {FIELD_INSPECTION_STATUS_LABELS[a.status]}
                {a.result ? ` · ${INSPECTION_RESULT_LABELS[a.result] ?? a.result}` : ""}
                {a.conductedDate
                  ? ` · ${new Date(a.conductedDate).toLocaleDateString("sq-AL")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!status.canApprove && status.assignments.length > 0 ? (
        <p className="mt-3 text-xs font-medium text-amber-900">
          Miratimi final nuk lejohet pa verifikim të përfunduar (PASS).
        </p>
      ) : null}

      <p className="mt-3 text-xs">
        <Link href="/ishmt/my-field-inspections" className="font-medium text-gov-primary hover:underline">
          Shiko detyrat e inspektimit në terren →
        </Link>
      </p>
    </section>
  );
}
