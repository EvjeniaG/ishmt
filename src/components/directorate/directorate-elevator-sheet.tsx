"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILDING_TYPE_LABELS, USAGE_PURPOSE_LABELS } from "@/lib/constants/owner-labels";
import {
  formatWorkflowHistoryLine,
  labelApplicationStatus,
  labelApplicationType,
  labelDelegationStatus,
  labelDelegationType,
  labelElevatorStatus,
} from "@/lib/constants/display-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";
import type { CompanyActivityItem } from "@/lib/services/directorate-activity-service";

const SHEET_TABS = [
  { id: "summary", label: "Përmbledhje" },
  { id: "location", label: "Lokacioni" },
  { id: "technical", label: "Të dhëna teknike" },
  { id: "certification", label: "Certifikimi" },
  { id: "delegations", label: "Delegimet" },
  { id: "history", label: "Historiku" },
] as const;

type SheetTab = (typeof SHEET_TABS)[number]["id"];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "-"}</p>
    </div>
  );
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("sq-AL");
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("sq-AL");
}

export function DirectorateElevatorSheet({ app }: { app: CompanyActivityItem }) {
  const [tab, setTab] = useState<SheetTab>("summary");
  const data = app.data;
  const elevator = app.originElevator ?? app.targetElevator;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gov-surface/40 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{app.applicationNumber}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {labelApplicationType(app.type)} · {labelApplicationStatus(app.status)}
            </p>
            {elevator && (
              <p className="mt-1 text-sm font-medium text-gov-primary">
                Ashensor: {elevator.registryNumber}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Përditësuar: {formatDateTime(app.updatedAt)}</p>
            {app.submittedAt && <p>Parashtruar: {formatDateTime(app.submittedAt)}</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 text-xs">
          {SHEET_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                tab === t.id
                  ? "bg-gov-primary text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-gov-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {tab === "summary" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nr. aplikimi" value={app.applicationNumber} />
            <Field label="Lloji" value={labelApplicationType(app.type)} />
            <Field label="Statusi" value={labelApplicationStatus(app.status)} />
            <Field label="Personi përgjegjës i ashensorit" value={app.ownerOrg.name} />
            <Field label="NIPT i personit përgjegjës" value={app.ownerOrg.nipt} />
            <Field
              label="Instaluesi"
              value={
                app.installerOrg ? (
                  <Link
                    href={`/directorate/companies/${app.installerOrg.id}`}
                    className="text-gov-primary hover:underline"
                  >
                    {app.installerOrg.name}
                  </Link>
                ) : (
                  "-"
                )
              }
            />
            <Field
              label="Certifikuesi / OMI"
              value={
                app.certifierOrg ? (
                  <Link
                    href={`/directorate/companies/${app.certifierOrg.id}`}
                    className="text-gov-primary hover:underline"
                  >
                    {app.certifierOrg.name}
                  </Link>
                ) : (
                  "-"
                )
              }
            />
            {elevator && (
              <>
                <Field label="Nr. regjistri" value={elevator.registryNumber} />
                <Field label="Statusi ashensori" value={labelElevatorStatus(elevator.status)} />
                <Field label="Data regjistrimit" value={formatDate(elevator.registrationDate)} />
              </>
            )}
            <Field label="Data aplikimit" value={formatDate(data?.applicationDate)} />
            <Field label="Parashtruar te ISHMT" value={formatDateTime(app.submittedAt)} />
          </div>
        )}

        {tab === "location" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Adresa" value={data?.buildingAddress ?? elevator?.buildingAddress} />
            <Field label="Emri ndërtesës" value={data?.buildingName} />
            <Field label="Bashkia" value={data?.municipality?.nameSq} />
            <Field label="Njësia administrative" value={data?.administrativeUnit?.nameSq} />
            <Field label="Hyrja" value={data?.entrance} />
            <Field label="Kati" value={data?.floorLocation} />
            <Field label="Pozicioni specifik" value={data?.specificPosition} />
            <Field
              label="Lloji ndërtese"
              value={data?.buildingType ? BUILDING_TYPE_LABELS[data.buildingType] : undefined}
            />
            <Field
              label="Qëllimi përdorimit"
              value={data?.usagePurpose ? USAGE_PURPOSE_LABELS[data.usagePurpose] : undefined}
            />
            <Field label="Entiteti përgjegjës" value={data?.responsibleEntityName} />
            <Field label="Identifikuesi" value={data?.responsibleEntityIdentifier} />
            <Field label="Email kontakti" value={data?.responsibleEntityEmail} />
            <Field label="Telefon kontakti" value={data?.responsibleEntityPhone} />
            <Field
              label="Koordinata GPS"
              value={
                data?.gpsLatitude && data?.gpsLongitude
                  ? `${data.gpsLatitude}, ${data.gpsLongitude}`
                  : undefined
              }
            />
            <Field label="Shënime" value={data?.notes} />
          </div>
        )}

        {tab === "technical" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Lloji ashensori" value={data?.elevatorType} />
            <Field label="Prodhuesi" value={data?.manufacturer} />
            <Field label="Modeli" value={data?.model} />
            <Field label="Nr. serial" value={data?.serialNumber} />
            <Field label="Viti prodhimit" value={data?.manufacturingYear} />
            <Field label="Kapaciteti (kg)" value={data?.capacityKg} />
            <Field label="Kapaciteti (persona)" value={data?.capacityPersons} />
            <Field label="Shpejtësia (m/s)" value={data?.speedMs?.toString()} />
            <Field label="Katet e shërbyera" value={data?.floorsServed} />
            <Field label="Ndalesat" value={data?.stops} />
            <Field label="Lloji i transmetimit" value={data?.driveType} />
          </div>
        )}

        {tab === "certification" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nr. certifikate instalimi" value={data?.installationCertificateNumber} />
            <Field label="Data certifikate instalimi" value={formatDate(data?.installationCertificateDate)} />
            <Field label="Nr. OMI" value={data?.omiNumber} />
            <Field label="Lloji i ekzaminimit" value={data?.examinationType} />
            <Field label="Data e ekzaminimit" value={formatDate(data?.examinationDate)} />
            <Field label="Rezultati i përputhshmërisë" value={data?.conformityResult} />
            <Field label="Referenca certifikatës" value={data?.certificateReference} />
            <Field label="Shënime certifikuesi" value={data?.certifierNotes} />
            <Field label="Shënime teknike certifikuesi" value={data?.certifierTechnicalNotes} />
          </div>
        )}

        {tab === "delegations" && (
          <div className="space-y-3">
            {app.delegations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nuk ka delegime të regjistruara.</p>
            ) : (
              app.delegations.map((d) => (
                <div key={d.id} className="rounded-md border px-4 py-3 text-sm">
                  <p className="font-medium">{d.organization.name}</p>
                  <p className="text-muted-foreground">
                    {labelDelegationType(d.accessType)} · {labelDelegationStatus(d.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ftuar: {formatDateTime(d.invitedAt)}
                    {d.acceptedAt && ` · Pranuar: ${formatDateTime(d.acceptedAt)}`}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {app.workflowHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nuk ka historik workflow.</p>
            ) : (
              app.workflowHistory.map((h) => (
                <div key={h.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
                  <span>
                    {formatWorkflowHistoryLine({
                      fromStatus: h.fromStatus,
                      toStatus: h.toStatus,
                      action: h.action,
                      statusLabels: APPLICATION_STATUS_LABELS,
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.actor.firstName} {h.actor.lastName} · {formatDateTime(h.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
