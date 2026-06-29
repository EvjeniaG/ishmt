type ApplicationDataLike = {
  applicationDate?: Date | string | null;
  buildingName?: string | null;
  buildingAddress?: string | null;
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
};

export function buildRegistrationFormDefaults(data: ApplicationDataLike | null | undefined) {
  const ext = (data?.registrationExtendedData as Record<string, string> | null) ?? {};
  const appDate = data?.applicationDate
    ? new Date(data.applicationDate).toISOString().slice(0, 10)
    : undefined;

  return {
    applicationDate: appDate,
    buildingName: data?.buildingName ?? undefined,
    buildingAddress: data?.buildingAddress ?? undefined,
    municipalityId: data?.municipalityId ?? undefined,
    administrativeUnitId: data?.administrativeUnitId ?? undefined,
    entrance: data?.entrance ?? undefined,
    specificPosition: data?.specificPosition ?? data?.floorLocation ?? undefined,
    legacyDistrictCode: data?.legacyDistrictCode ?? undefined,
    responsibleEntityName: data?.responsibleEntityName ?? undefined,
    responsibleEntityIdentifier: data?.responsibleEntityIdentifier ?? undefined,
    responsibleEntityEmail: data?.responsibleEntityEmail ?? undefined,
    responsibleEntityPhone: data?.responsibleEntityPhone ?? undefined,
    ownerNotes: data?.notes ?? undefined,
    registrationExtendedData:
      (data?.registrationExtendedData as Record<string, unknown> | null) ?? undefined,
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
  };
}
