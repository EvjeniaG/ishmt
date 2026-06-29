import type { ElevatorTechnicalData } from "@prisma/client";
import {
  buildRegistrationDossier,
  type DossierSection,
  type RegistrationDossierApplication,
} from "@/lib/registration/build-dossier";

const ELEVATOR_TYPE_LABELS: Record<string, string> = {
  PASSENGER: "Pasagjerësh",
  FREIGHT: "Mallrash",
  SERVICE: "Shërbimi",
  HANDICAPPED: "Persona me aftësi të kufizuara",
  ESCALATOR: "Shkallë lëvizëse",
  MOVING_WALK: "Trotuar lëvizës",
};

function labelElevatorType(type: string): string {
  return ELEVATOR_TYPE_LABELS[type] ?? type;
}

type OriginatingApplication = RegistrationDossierApplication;

type ElevatorForDossier = {
  registryNumber: string;
  technicalData: ElevatorTechnicalData | null;
  originatingApplication: OriginatingApplication | null;
};

function overlayTechnicalFromElevator(
  sections: DossierSection[],
  technical: ElevatorTechnicalData | null,
): DossierSection[] {
  if (!technical) return sections;

  const overrides: Record<string, string | number | null | undefined> = {
    Prodhuesi: technical.manufacturer,
    Modeli: technical.model,
    "Nr. serial": technical.serialNumber,
    "Viti i instalimit": technical.manufacturingYear,
    "Kapaciteti (kg)": technical.capacityKg,
    "Kapaciteti (persona)": technical.capacityPersons,
    "Shpejtësia": technical.speedMs ? `${technical.speedMs} m/s` : undefined,
    "Kate të shërbyera": technical.floorsServed,
    Ndalesa: technical.stops,
    "Lloji i ngritjes": technical.driveType,
  };

  const extraFields = [
    { label: "Lloji i ashensorit", value: labelElevatorType(technical.elevatorType) },
    { label: "Lloji i dyerve", value: technical.doorType },
    { label: "Sistemi i kontrollit", value: technical.controlSystem },
  ]
    .filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== "")
    .map((f) => ({ label: f.label, value: String(f.value) }));

  return sections.map((section) => {
    if (section.id !== "technical") return section;
    const mergedFields = section.fields.map((field) => {
      const override = overrides[field.label];
      if (override === null || override === undefined || String(override).trim() === "") {
        return field;
      }
      return { ...field, value: String(override) };
    });
    const existingLabels = new Set(mergedFields.map((f) => f.label));
    for (const extra of extraFields) {
      if (!existingLabels.has(extra.label)) mergedFields.push(extra);
    }
    return { ...section, fields: mergedFields };
  });
}

export function buildElevatorCompleteDossier(elevator: ElevatorForDossier): DossierSection[] {
  const app = elevator.originatingApplication;
  if (!app?.data) return [];

  const { sections } = buildRegistrationDossier(app);
  return overlayTechnicalFromElevator(sections, elevator.technicalData);
}
