import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { AppLink } from "@/components/shared/app-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ElevatorApplicationListItem } from "@/lib/elevators/build-tab-dossier";

function fmtDateTime(value: Date | null): string {
  if (!value) return "-";
  return value.toLocaleString("sq-AL", { dateStyle: "short", timeStyle: "short" });
}

function ApplicationRecordCard({ item }: { item: ElevatorApplicationListItem }) {
  const title = item.isOrigin ? `${item.typeLabel} (fillestar)` : item.typeLabel;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {item.isOrigin ? (
              <span className="portal-badge-neutral">Fillestar</span>
            ) : null}
            <ApplicationStatusBadge
              status={item.status as ApplicationStatus}
              type={item.type as ApplicationType}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="workflow-data-grid">
          <div className="workflow-data-cell">
            <dt className="workflow-data-label">Numri i aplikimit</dt>
            <dd className="workflow-data-value">
              <AppLink
                href={`/portal/applications/${item.id}`}
                className="font-medium text-gov-primary hover:underline"
              >
                {item.applicationNumber}
              </AppLink>
            </dd>
          </div>
          <div className="workflow-data-cell">
            <dt className="workflow-data-label">Krijuar më</dt>
            <dd className="workflow-data-value">{fmtDateTime(item.createdAt)}</dd>
          </div>
          <div className="workflow-data-cell">
            <dt className="workflow-data-label">Parashtruar më</dt>
            <dd className="workflow-data-value">{fmtDateTime(item.submittedAt)}</dd>
          </div>
          {item.notes && item.notes !== "-" ? (
            <div className="workflow-data-cell sm:col-span-2">
              <dt className="workflow-data-label">Shënime</dt>
              <dd className="workflow-data-value break-words">{item.notes}</dd>
            </div>
          ) : null}
        </dl>
        <AppLink
          href={`/portal/applications/${item.id}`}
          className="mt-4 inline-block text-sm font-medium text-gov-primary hover:underline"
        >
          Hap dosjen e plotë →
        </AppLink>
      </CardContent>
    </Card>
  );
}

export function ElevatorApplicationsPanel({
  applications,
}: {
  applications: ElevatorApplicationListItem[];
}) {
  if (applications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nuk ka aplikime të regjistruara për këtë ashensor.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {applications.map((item) => (
        <ApplicationRecordCard key={item.id} item={item} />
      ))}
    </div>
  );
}
