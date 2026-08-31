import { DataUpdateType } from "@prisma/client";

export type LifecycleFieldMode = "correction" | "update";

export type EditableFieldDef = {
  field: string;
  label: string;
};

/** Fushat e ndryshimit sipas Udhëzimit, pika 11 (korrigjim gabimesh). */
export const CORRECTION_FIELDS: EditableFieldDef[] = [
  { field: "serialNumber", label: "Nr. serial i ashensorit" },
  { field: "manufacturer", label: "Marka/Prodhuesi" },
  { field: "model", label: "Modeli i ashensorit" },
  { field: "buildingAddress", label: "Vendndodhja (adresa)" },
  { field: "responsibleEntityName", label: "Personi përgjegjës i ashensorit" },
  { field: "responsibleEntityIdentifier", label: "NIPT/NID" },
  { field: "floorsServed", label: "Kate të shërbyera" },
  { field: "capacityKg", label: "Kapaciteti (kg)" },
  { field: "omiNumber", label: "Nr. identifikimi OM" },
  { field: "examinationType", label: "Lloji i ekzaminimit" },
];

/** Fushat e përditësimit sipas Udhëzimit, pika 15d. */
const UPDATE_FIELDS_BY_TYPE: Record<DataUpdateType, EditableFieldDef[]> = {
  [DataUpdateType.SERIAL_NUMBER_CHANGE]: [
    { field: "serialNumber", label: "Nr. serial i ashensorit" },
    { field: "manufacturer", label: "Marka/Prodhuesi" },
  ],
  [DataUpdateType.ADDRESS_CHANGE]: [{ field: "buildingAddress", label: "Vendndodhja (adresa)" }],
  [DataUpdateType.MAINTENANCE_COMPANY_CHANGE]: [
    { field: "maintenanceOrgId", label: "Kompania e mirëmbajtjes" },
  ],
  [DataUpdateType.CONTACT_UPDATE]: [
    { field: "responsibleEntityPhone", label: "Telefoni i kontaktit" },
    { field: "responsibleEntityEmail", label: "Email i kontaktit" },
  ],
  [DataUpdateType.RESPONSIBLE_ENTITY_CHANGE]: [
    { field: "responsibleEntityName", label: "Personi përgjegjës i ashensorit" },
    { field: "responsibleEntityIdentifier", label: "NIPT/NID" },
  ],
  [DataUpdateType.OWNERSHIP_TRANSFER]: [],
};

export function getEditableFields(
  mode: LifecycleFieldMode,
  updateType?: string | null,
): EditableFieldDef[] {
  if (mode === "correction") return CORRECTION_FIELDS;

  if (!updateType) {
    return [
      { field: "serialNumber", label: "Nr. serial i ashensorit" },
      { field: "buildingAddress", label: "Vendndodhja (adresa)" },
      { field: "responsibleEntityName", label: "Personi përgjegjës i ashensorit" },
      { field: "responsibleEntityIdentifier", label: "NIPT/NID" },
    ];
  }

  const typed = updateType as DataUpdateType;
  return UPDATE_FIELDS_BY_TYPE[typed] ?? [];
}

export function assertAllowedFieldChanges(
  mode: LifecycleFieldMode,
  changes: { field: string }[],
  updateType?: string | null,
): void {
  const allowed = new Set(getEditableFields(mode, updateType).map((f) => f.field));
  for (const change of changes) {
    if (!allowed.has(change.field)) {
      throw new Error(`Fusha "${change.field}" nuk lejohet për këtë lloj ${mode === "correction" ? "ndryshimi" : "përditësimi"}.`);
    }
  }
}
