import type { RegistrationBasicDataInput } from "@/lib/validations/registration-basic-data";

type MunicipalityOption = {
  id: string;
  nameSq: string;
  code?: string | null;
  legacyRegistryCode?: string | null;
};

export function buildRegistrationBasicDataDummy(input: {
  municipalities: MunicipalityOption[];
  ownerName?: string;
  ownerNipt?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
}): Record<keyof RegistrationBasicDataInput, string> {
  const today = new Date().toISOString().slice(0, 10);
  const tirana =
    input.municipalities.find((m) => m.code === "TIA" || /tiran/i.test(m.nameSq)) ??
    input.municipalities[0];

  return {
    applicationDate: today,
    elevatorInServiceDate: "2018-07-15",
    elevatorConditionType: "EXISTING",
    applicationSubtype: "FIRST",
    existingRegisteredElevatorsCount: "",
    responsibleEntityType: "ADMINISTRATOR",
    responsibleEntityName: input.ownerName ?? "Shoqëria Demo Sh.p.k.",
    responsibleIdentifierType: "NIPT",
    responsibleIdentifier: input.ownerNipt ?? "L12345678A",
    responsiblePhone: input.ownerPhone ?? "+355692000001",
    responsibleEmail: input.ownerEmail ?? "demo.owner@ishmt.local",
    representedBy: "Arben Demo",
    representativePosition: "Administrator",
    buildingName: "Godina Demo IQMT",
    buildingAddress: "Rruga e Dibrës Nr. 15, Tiranë",
    buildingAddressMode: "text",
    gpsLatitude: "",
    gpsLongitude: "",
    municipalityId: tirana?.id ?? "",
    administrativeUnitId: "",
    entrance: "A",
    specificPosition: "Kati 0 - hyrja kryesore",
    registrationBuildingType: "NDERTESA_NE_BASHKEPRONESI",
    buildingMainUse: "",
    businessNameIfWorkplace: "",
    businessNiptIfWorkplace: "",
    usagePurposeCode: "TRANSPORT_NJEREZISH_ELEKTRIK",
    usagePurposeOther: "",
    ownerNotes: "Të dhëna fikstive për testim - kontrolloni dhe ruajeni manualisht.",
    saveAsDraft: "false",
  };
}
