import {
  mergeApplicationDataWithOwnerPrefill,
  type OwnerRegistrationPrefill,
} from "@/lib/registration/owner-registration-prefill";

type ApplicationDataLike = {
  applicationDate?: Date | string | null;
  buildingName?: string | null;
  buildingAddress?: string | null;
  gpsLatitude?: unknown;
  gpsLongitude?: unknown;
  municipalityId?: string | null;
  administrativeUnitId?: string | null;
  entrance?: string | null;
  floorLocation?: string | null;
  specificPosition?: string | null;
  legacyDistrictCode?: string | null;
  buildingType?: string | null;
  usagePurpose?: string | null;
  responsibleEntityName?: string | null;
  responsibleEntityIdentifier?: string | null;
  responsibleEntityEmail?: string | null;
  responsibleEntityPhone?: string | null;
  notes?: string | null;
  registrationExtendedData?: unknown;
  additionalTechnical?: unknown;
};

export function buildRegistrationFormDefaults(
  data: ApplicationDataLike | null | undefined,
  prefill?: OwnerRegistrationPrefill | null,
) {
  const merged = mergeApplicationDataWithOwnerPrefill(data, prefill);
  const ext = (merged?.registrationExtendedData as Record<string, string> | null) ?? {};
  const additional = (merged?.additionalTechnical as Record<string, string> | null) ?? {};
  const appDate = merged?.applicationDate
    ? new Date(merged.applicationDate).toISOString().slice(0, 10)
    : undefined;

  return {
    applicationDate: appDate,
    elevatorInServiceDate:
      ext.elevatorInServiceDate ??
      additional.installationDate ??
      additional.commissioningDate ??
      undefined,
    buildingName: merged?.buildingName ?? undefined,
    buildingAddress: merged?.buildingAddress ?? undefined,
    buildingAddressMode:
      ext.buildingAddressMode ??
      (merged?.gpsLatitude != null && merged?.gpsLongitude != null ? "gps" : "text"),
    gpsLatitude:
      merged?.gpsLatitude != null && merged?.gpsLatitude !== ""
        ? Number(merged.gpsLatitude)
        : undefined,
    gpsLongitude:
      merged?.gpsLongitude != null && merged?.gpsLongitude !== ""
        ? Number(merged.gpsLongitude)
        : undefined,
    municipalityId: merged?.municipalityId ?? undefined,
    administrativeUnitId: merged?.administrativeUnitId ?? undefined,
    entrance: merged?.entrance ?? undefined,
    specificPosition: merged?.specificPosition ?? merged?.floorLocation ?? undefined,
    legacyDistrictCode: merged?.legacyDistrictCode ?? undefined,
    responsibleEntityName: merged?.responsibleEntityName ?? undefined,
    responsibleEntityIdentifier: merged?.responsibleEntityIdentifier ?? undefined,
    responsibleEntityEmail: merged?.responsibleEntityEmail ?? undefined,
    responsibleEntityPhone: merged?.responsibleEntityPhone ?? undefined,
    ownerNotes: merged?.notes ?? undefined,
    registrationExtendedData:
      (merged?.registrationExtendedData as Record<string, unknown> | null) ?? undefined,
    elevatorConditionType: ext.elevatorConditionType,
    applicationSubtype: ext.applicationSubtype,
    responsibleEntityType: ext.responsibleEntityType,
    responsibleIdentifierType: ext.responsibleIdentifierType,
    responsibleAddress: ext.responsibleAddress,
    representedBy: ext.representedBy,
    representativePosition: ext.representativePosition,
    registrationBuildingType: ext.registrationBuildingType,
    buildingMainUse: ext.buildingMainUse,
    businessNameIfWorkplace: ext.businessNameIfWorkplace,
    businessNiptIfWorkplace: ext.businessNiptIfWorkplace,
    usagePurposeCode: ext.usagePurposeCode,
    usagePurposeOther: ext.usagePurposeOther,
    existingRegisteredElevatorsCount: ext.existingRegisteredElevatorsCount,
    ownerProfileSnapshot: prefill?.profileSnapshot,
  };
}
