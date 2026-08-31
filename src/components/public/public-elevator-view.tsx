import type { PublicAlert, PublicQrProfile } from "@/lib/services/qr-service";
import { ComplianceService } from "@/lib/services/compliance-service";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { PERIODIC_INSPECTIONS_LABEL } from "@/lib/constants/periodic-inspection-labels";

const ELEVATOR_TYPE_LABELS: Record<string, string> = {
  PASSENGER: "Ashensor pasagjerësh",
  FREIGHT: "Ashensor mallrash",
  SERVICE: "Ashensor shërbimi",
  HANDICAPPED: "Ashensor për persona me aftësi të kufizuara",
  ESCALATOR: "Shkallë lëvizëse",
  MOVING_WALK: "Trotuar lëvizës",
};

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Fillestar",
  PERIODIC: "Periodik",
  EXTRAORDINARY: "Jashtëzakonshme",
  RE_INSPECTION: "Rinspektim",
};

const INSPECTION_RESULT_LABELS: Record<string, string> = {
  PASS: "Kaloi",
  FAIL: "Dështoi",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

function fmtDate(value: Date | null | undefined): string {
  if (!value) return "Nuk ka informacion";
  return new Date(value).toLocaleDateString("sq-AL");
}

function alertStyles(level: PublicAlert["level"]) {
  switch (level) {
    case "danger":
      return "border-red-300 bg-red-50 text-red-900";
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-950";
    case "info":
      return "border-green-200 bg-green-50 text-green-900";
  }
}

function DataRow({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={missing ? "font-semibold text-red-700" : "font-medium"}>{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function PublicElevatorView({ profile, code }: { profile: PublicQrProfile; code: string }) {
  const display = ComplianceService.getPublicDisplay(profile.complianceIndicator);
  const dangerAlerts = profile.alerts.filter((a) => a.level === "danger");
  const warningAlerts = profile.alerts.filter((a) => a.level === "warning");
  const infoAlerts = profile.alerts.filter((a) => a.level === "info");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <p className="text-sm font-medium text-primary">IQMT - Regjistri Publik i Ashensorëve</p>
          <h1 className="mt-1 text-2xl font-bold">{profile.registryNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.buildingName ? `${profile.buildingName} · ` : ""}
            {profile.municipality}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <section className={`rounded-lg border bg-white p-6 shadow-sm ring-4 ${display.ringClass}`}>
          <div className="flex items-start gap-4">
            <span className={`mt-1 inline-block h-5 w-5 shrink-0 rounded-full ${display.dotClass}`} />
            <div className="flex-1">
              <p className={`text-lg font-semibold ${display.textClass}`}>{display.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Statusi në regjistër: {labelElevatorStatus(profile.status)}
              </p>
            </div>
          </div>
        </section>

        {[...dangerAlerts, ...warningAlerts].length > 0 && (
          <Section title="Alarme dhe njoftime">
            <ul className="space-y-3">
              {[...dangerAlerts, ...warningAlerts].map((alert) => (
                <li key={alert.title} className={`rounded-md border p-4 text-sm ${alertStyles(alert.level)}`}>
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-1">{alert.detail}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.deregistered && profile.deregistrationReason && (
          <section className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Arsye çregjistrimi</p>
            <p className="mt-1">{profile.deregistrationReason}</p>
          </section>
        )}

        <Section title="Regjistrimi">
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <DataRow label="Nr. regjistrit" value={profile.registryNumber} />
            <DataRow label="Statusi" value={labelElevatorStatus(profile.status)} />
            <DataRow label="Bashkia" value={profile.municipality} />
            {profile.buildingName && <DataRow label="Godina" value={profile.buildingName} />}
            <DataRow label="Data e regjistrimit" value={fmtDate(profile.registrationDate)} />
            <DataRow label="Data e aktivizimit" value={fmtDate(profile.activationDate)} />
            {profile.registrationCertificateNumber && (
              <DataRow label="Nr. certifikate regjistrimi" value={profile.registrationCertificateNumber} />
            )}
            <DataRow label="Skadimi i certifikatës" value={fmtDate(profile.registrationCertificateExpiry)} />
          </dl>
        </Section>

        <Section title={PERIODIC_INSPECTIONS_LABEL}>
          {!profile.lastInspectionDate && (
            <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              Nuk ka asnjë inspektim periodik të regjistruar për këtë ashensor.
            </p>
          )}
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <DataRow
              label="Inspektimi i fundit"
              value={fmtDate(profile.lastInspectionDate)}
              missing={!profile.lastInspectionDate}
            />
            <DataRow
              label="Lloji i inspektimit"
              value={
                profile.lastInspectionType
                  ? INSPECTION_TYPE_LABELS[profile.lastInspectionType] ?? profile.lastInspectionType
                  : "Nuk ka informacion"
              }
              missing={!profile.lastInspectionType}
            />
            <DataRow
              label="Rezultati i fundit"
              value={
                profile.lastInspectionResult
                  ? INSPECTION_RESULT_LABELS[profile.lastInspectionResult] ?? profile.lastInspectionResult
                  : "Nuk ka informacion"
              }
              missing={!profile.lastInspectionResult}
            />
            <DataRow label="Inspektimi i radhës deri më" value={fmtDate(profile.nextInspectionDate)} />
            <DataRow
              label="Gjendja e inspektimit periodik"
              missing={!profile.lastInspectionDate || !profile.compliance.inspectionValid}
              value={
                !profile.lastInspectionDate
                  ? "Mungon - nuk ka inspektim të regjistruar"
                  : !profile.compliance.inspectionValid
                    ? "Jo në përputhje"
                    : profile.compliance.inspectionExpiring
                      ? "Afati po skadon"
                      : "Në përputhje"
              }
            />
          </dl>
        </Section>

        <Section title="Mirëmbajtje">
          {!profile.maintenanceCompany && (
            <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              Nuk ka kompani mirëmbajtjeje të caktuar për këtë ashensor.
            </p>
          )}
          {profile.maintenanceCompany && !profile.lastMaintenanceDate && (
            <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              Nuk figuron asnjë regjistrim mirëmbajtjeje për këtë ashensor.
            </p>
          )}
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <DataRow
              label="Kompania e mirëmbajtjes"
              value={profile.maintenanceCompany ?? "Nuk është caktuar"}
              missing={!profile.maintenanceCompany}
            />
            <DataRow
              label="Mirëmbajtja e fundit"
              value={fmtDate(profile.lastMaintenanceDate)}
              missing={!profile.lastMaintenanceDate}
            />
            <DataRow label="Mirëmbajtja e radhës deri më" value={fmtDate(profile.nextMaintenanceDueDate)} />
            <DataRow
              label="Gjendja e mirëmbajtjes"
              missing={
                !profile.maintenanceCompany ||
                !profile.lastMaintenanceDate ||
                !profile.compliance.maintenanceValid
              }
              value={
                !profile.maintenanceCompany
                  ? "Mungon - nuk ka kompani mirëmbajtjeje"
                  : !profile.lastMaintenanceDate
                    ? "Mungon - nuk ka regjistrim mirëmbajtjeje"
                    : !profile.compliance.maintenanceValid
                      ? profile.maintenanceDaysOverdue > 0
                        ? `Jo në përputhje (${profile.maintenanceDaysOverdue} ditë vonë)`
                        : "Jo në përputhje"
                      : profile.compliance.maintenanceExpiring
                        ? "Afati po skadon"
                        : "Në përputhje"
              }
            />
          </dl>
        </Section>

        <Section title="Të dhënat teknike">
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <DataRow
              label="Lloji"
              value={
                profile.elevatorType
                  ? ELEVATOR_TYPE_LABELS[profile.elevatorType] ?? profile.elevatorType
                  : "Nuk ka informacion"
              }
            />
            <DataRow label="Prodhuesi" value={profile.manufacturer ?? "Nuk ka informacion"} />
            <DataRow label="Modeli" value={profile.model ?? "Nuk ka informacion"} />
            <DataRow label="Nr. serial" value={profile.serialNumber ?? "Nuk ka informacion"} />
            <DataRow label="Kapaciteti" value={profile.capacity ?? "Nuk ka informacion"} />
            <DataRow
              label="Kate të shërbimit"
              value={profile.floorsServed != null ? String(profile.floorsServed) : "Nuk ka informacion"}
            />
          </dl>
        </Section>

        {infoAlerts.length > 0 && dangerAlerts.length === 0 && warningAlerts.length === 0 && (
          <section className={`rounded-lg border p-4 text-sm ${alertStyles("info")}`}>
            <p className="font-semibold">{infoAlerts[0]?.title}</p>
            <p className="mt-1">{infoAlerts[0]?.detail}</p>
          </section>
        )}

        <Section title="Raportoni një problem">
          <p className="mb-4 text-sm text-muted-foreground">
            Nëse vëreni një problem sigurie ose mungesë informacioni për këtë ashensor, raportojeni te IQMT.
          </p>
          <a
            href={`/report?code=${encodeURIComponent(code)}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-gov-primary px-4 text-sm font-medium text-white hover:bg-gov-secondary"
          >
            Raporto problem për këtë ashensor
          </a>
        </Section>

        <p className="text-center text-xs text-muted-foreground">
          Të dhënat e personit përgjegjës të ashensorit, adresa e plotë e ndërtesës dhe informacioni i brendshëm administrativ nuk shfaqen
          publikisht për arsye sigurie.
        </p>
      </main>
    </div>
  );
}
