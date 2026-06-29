import { BUILDING_TYPE_LABELS, USAGE_PURPOSE_LABELS } from "@/lib/constants/owner-labels";
import type { BuildingType, UsagePurpose } from "@prisma/client";
import {
  displayCertifierOrganizationName,
  formatOmBodyNumber,
} from "@/lib/elevators/format-om-body";

const ELEVATOR_TYPE_LABELS: Record<string, string> = {
  PASSENGER: "Pasagjerësh",
  FREIGHT: "Ngarkesash",
  SERVICE: "Shërbimi",
  HANDICAPPED: "Persona me aftësi të kufizuara",
  ESCALATOR: "Shkallë lëvizëse",
  MOVING_WALK: "Rrip lëvizës",
};

const CONFORMITY_RESULT_LABELS: Record<string, string> = {
  CONFORM: "Në përputhje",
  NON_CONFORM: "Jo në përputhje",
  CONDITIONAL: "Në përputhje me kushte",
};

export type ApplicationSummaryData = {
  buildingName?: string | null;
  buildingAddress?: string | null;
  municipality?: { nameSq: string } | null;
  entrance?: string | null;
  floorLocation?: string | null;
  specificPosition?: string | null;
  buildingType?: BuildingType | null;
  usagePurpose?: UsagePurpose | null;
  responsibleEntityName?: string | null;
  responsibleEntityIdentifier?: string | null;
  responsibleEntityEmail?: string | null;
  responsibleEntityPhone?: string | null;
  notes?: string | null;
  elevatorType?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  manufacturingYear?: number | null;
  capacityKg?: number | null;
  capacityPersons?: number | null;
  speedMs?: unknown;
  floorsServed?: number | null;
  stops?: number | null;
  driveType?: string | null;
  installationCertificateNumber?: string | null;
  installationCertificateDate?: Date | string | null;
  omiNumber?: string | null;
  examinationType?: string | null;
  examinationDate?: Date | string | null;
  conformityResult?: string | null;
  certificateReference?: string | null;
  certifierNotes?: string | null;
  certifierTechnicalNotes?: string | null;
};

type FieldDef = { label: string; value: string | number | null | undefined };

function fmtDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("sq-AL");
}

function Group({ title, fields }: { title: string; fields: FieldDef[] }) {
  const visible = fields.filter(
    (f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== "",
  );
  if (visible.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="workflow-data-grid">
        {visible.map((f) => (
          <div key={f.label} className="workflow-data-cell">
            <dt className="workflow-data-label">{f.label}</dt>
            <dd className="workflow-data-value break-words">{String(f.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Full, read-only view of every datum captured during an application
 * (owner location/responsible data, installer technical data, certifier/OMI data).
 * Shown identically to the owner and the ISHMT inspector for complete transparency.
 */
export function ApplicationDataSummary({
  data,
  orgs,
  title = "Përmbledhje e aplikimit",
  hideCertification = false,
}: {
  data: ApplicationSummaryData | null;
  orgs?: { owner?: string | null; installer?: string | null; certifier?: string | null };
  title?: string;
  hideCertification?: boolean;
}) {
  if (!data) return null;

  const speed =
    data.speedMs === null || data.speedMs === undefined ? null : `${String(data.speedMs)} m/s`;

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <h2 className="workflow-section-title">{title}</h2>
        <p className="workflow-section-desc">Të dhënat e regjistruara në aplikim</p>
      </div>
      <div className="workflow-section-body space-y-6">
        {orgs ? (
          <Group
            key="orgs"
            title="Subjektet e përfshirë"
            fields={[
              { label: "Personi përgjegjës i ashensorit", value: orgs.owner },
              { label: "Kompania instaluese", value: orgs.installer },
              {
                label: "Trupi OM / certifikuesi",
                value: orgs.certifier
                  ? displayCertifierOrganizationName(orgs.certifier, data.omiNumber)
                  : null,
              },
            ]}
          />
        ) : null}

        <Group
          key="location"
          title="Vendndodhja"
          fields={[
            { label: "Emri i ndërtesës", value: data.buildingName },
            { label: "Adresa", value: data.buildingAddress },
            { label: "Bashkia", value: data.municipality?.nameSq },
            { label: "Hyrja", value: data.entrance },
            { label: "Kati", value: data.floorLocation },
            { label: "Pozicioni specifik", value: data.specificPosition },
            {
              label: "Tipi i ndërtesës",
              value: data.buildingType ? BUILDING_TYPE_LABELS[data.buildingType] : null,
            },
            {
              label: "Qëllimi i përdorimit",
              value: data.usagePurpose ? USAGE_PURPOSE_LABELS[data.usagePurpose] : null,
            },
            { label: "Personi përgjegjës i ashensorit", value: data.responsibleEntityName },
            { label: "NIPT / NID", value: data.responsibleEntityIdentifier },
            { label: "Email", value: data.responsibleEntityEmail },
            { label: "Telefon", value: data.responsibleEntityPhone },
            { label: "Shënime", value: data.notes },
          ]}
        />

        <Group
          key="technical"
          title="Të dhënat teknike (instaluesi)"
          fields={[
            {
              label: "Lloji i ashensorit",
              value: data.elevatorType ? ELEVATOR_TYPE_LABELS[data.elevatorType] ?? data.elevatorType : null,
            },
            { label: "Prodhuesi", value: data.manufacturer },
            { label: "Modeli", value: data.model },
            { label: "Numri serial", value: data.serialNumber },
            { label: "Viti i prodhimit", value: data.manufacturingYear },
            { label: "Kapaciteti (kg)", value: data.capacityKg },
            { label: "Kapaciteti (persona)", value: data.capacityPersons },
            { label: "Shpejtësia", value: speed },
            { label: "Katet e shërbyer", value: data.floorsServed },
            { label: "Ndalesat", value: data.stops },
            { label: "Lloji i sistemit", value: data.driveType },
          ]}
        />

        {!hideCertification ? (
          <Group
            key="certification"
            title="Certifikimi (certifikuesi / OMI)"
            fields={[
              { label: "Numri i certifikatës së instalimit", value: data.installationCertificateNumber },
              { label: "Data e certifikatës", value: fmtDate(data.installationCertificateDate) },
              {
                label: "Trupi OM",
                value: formatOmBodyNumber(data.omiNumber) ?? data.omiNumber,
              },
              { label: "Lloji i ekzaminimit", value: data.examinationType },
              { label: "Data e ekzaminimit", value: fmtDate(data.examinationDate) },
              {
                label: "Rezultati i përputhshmërisë",
                value: data.conformityResult
                  ? CONFORMITY_RESULT_LABELS[data.conformityResult] ?? data.conformityResult
                  : null,
              },
              { label: "Referenca e certifikatës", value: data.certificateReference },
              { label: "Shënime certifikuese", value: data.certifierNotes },
              { label: "Shënime teknike", value: data.certifierTechnicalNotes },
            ]}
          />
        ) : null}
      </div>
    </section>
  );
}
