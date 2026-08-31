"use client";

import Link from "next/link";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { reverseGeocodePlaceAction } from "@/lib/actions/citizen-report-actions";
import { saveRegistrationBasicDataAction } from "@/lib/actions/registration-actions";
import { splitReverseGeocodeLabel } from "@/lib/geo/reverse-geocode";
import { cn } from "@/lib/utils";
import {
  APPLICATION_OWNER_ENTITY_TYPES,
  applicationOwnerEntityTypeLabel,
  ownerRequiresNipt,
  ownerSubjectNameRequired,
} from "@/lib/registration/owner-entity-role";
import type { OwnerProfileSnapshot } from "@/lib/registration/owner-registration-prefill";
import { PROFILE_SECTION_TITLES } from "@/lib/registration/profile-sections";
import {
  APPLICATION_SUBTYPE_LABELS,
  REGISTRATION_BUILDING_TYPE_LABELS,
  REGISTRATION_USAGE_PURPOSE_LABELS,
} from "@/lib/registration/labels";
import { buildRegistrationBasicDataDummy } from "@/lib/demo/registration-basic-data-dummy";
import { isDemoToolsEnabled } from "@/lib/demo/registration-demo-steps";
import { inferElevatorConditionFromInServiceDate } from "@/lib/registration/registration-workflow-prefill";
import { applyValuesToForm } from "@/lib/forms/apply-form-values";
import { FormStep } from "@/components/shared/institutional";
import {
  RegistrationFieldGrid,
  RegistrationSelect,
  RegistrationStepActions,
} from "@/components/registration/registration-wizard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDocumentsSection } from "@/components/applications/form-documents-section";

type Defaults = Record<string, string | number | undefined | null | Record<string, unknown>>;

type MunicipalityOption = {
  id: string;
  nameSq: string;
  code?: string | null;
  legacyRegistryCode?: string | null;
};

type BuildingAddressMode = "text" | "gps";
type GpsCoords = { latitude: number; longitude: number };

function mapsUrlForCoords(coords: GpsCoords) {
  return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
}

function ReadOnlyValue({ value }: { value?: string | null }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
      {value?.trim() || "-"}
    </div>
  );
}

function SubFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border border-border/70 bg-muted/15 p-4">
      <p className="text-sm font-medium">{title}</p>
      <RegistrationFieldGrid columns={2}>{children}</RegistrationFieldGrid>
    </div>
  );
}

function Field({ label, helper, children, required }: { label: string; helper?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}{required && " *"}</Label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      {children}
    </div>
  );
}

export function RegistrationBasicDataForm({
  applicationId,
  municipalities,
  defaults,
  layoutPlanSlot,
  documentsSlot,
  editMode = "wizard",
}: {
  applicationId: string;
  municipalities: MunicipalityOption[];
  defaults: Defaults;
  layoutPlanSlot?: React.ReactNode;
  documentsSlot?: React.ReactNode;
  editMode?: "wizard" | "pre-submit";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ext = (defaults.registrationExtendedData as Record<string, string> | null) ?? {};

  const defaultApplicationSubtype =
    ext.applicationSubtype === "ADDITIONAL" || ext.applicationSubtype === "FIRST"
      ? ext.applicationSubtype
      : "FIRST";
  const defaultExistingRegisteredCount =
    ext.existingRegisteredElevatorsCount != null
      ? String(ext.existingRegisteredElevatorsCount)
      : "";
  const defaultInServiceDate =
    (defaults.elevatorInServiceDate as string) ??
    ext.elevatorInServiceDate ??
    "";
  const [applicationSubtype, setApplicationSubtype] = useState<"FIRST" | "ADDITIONAL">(
    defaultApplicationSubtype,
  );
  const [usagePurposeCode, setUsagePurposeCode] = useState(ext.usagePurposeCode ?? "");
  const [elevatorInServiceDate, setElevatorInServiceDate] = useState(defaultInServiceDate);
  const [elevatorCondition, setElevatorCondition] = useState<"NEW" | "EXISTING" | "">(() => {
    if (!defaultInServiceDate) return "";
    const inferred = inferElevatorConditionFromInServiceDate(defaultInServiceDate);
    if (inferred) return inferred;
    const saved = ext.elevatorConditionType;
    return saved === "NEW" || saved === "EXISTING" ? saved : "";
  });

  function handleInServiceDateChange(value: string) {
    setElevatorInServiceDate(value);
    if (!value.trim()) {
      setElevatorCondition("");
      return;
    }
    const inferred = inferElevatorConditionFromInServiceDate(value);
    if (inferred) setElevatorCondition(inferred);
  }

  const initialMunicipalityId = (defaults.municipalityId as string) ?? "";
  const initialAdminUnitId = (defaults.administrativeUnitId as string) ?? "";

  const ownerProfileSnapshot = defaults.ownerProfileSnapshot as OwnerProfileSnapshot | undefined;
  const responsibleFromProfile = Boolean(ownerProfileSnapshot);
  const initialEntityType = (ext.responsibleEntityType as string) || "ADMINISTRATOR";
  const [responsibleEntityType] = useState(initialEntityType);
  const [responsibleName] = useState((defaults.responsibleEntityName as string) ?? "");
  const [identifier] = useState<string>((defaults.responsibleEntityIdentifier as string) ?? "");
  const [responsiblePhone] = useState((defaults.responsibleEntityPhone as string) ?? "");
  const [responsibleEmail] = useState((defaults.responsibleEntityEmail as string) ?? "");
  const [representedBy] = useState((ext.representedBy as string) ?? "");
  const isAdministrator = responsibleEntityType === "ADMINISTRATOR";
  const isCompanySubject = ownerSubjectNameRequired(responsibleEntityType);
  const usesNipt = ownerRequiresNipt(responsibleEntityType);
  const responsibleIdentifierType = usesNipt ? "NIPT" : "NID";
  const [fillHint, setFillHint] = useState<string | null>(null);
  const showDemoTools = isDemoToolsEnabled();
  const defaultBuildingAddressMode =
    (ext.buildingAddressMode as BuildingAddressMode | undefined) ??
    (defaults.gpsLatitude != null && defaults.gpsLongitude != null ? "gps" : "text");
  const [buildingAddressMode, setBuildingAddressMode] = useState<BuildingAddressMode>(defaultBuildingAddressMode);
  const [buildingAddress, setBuildingAddress] = useState((defaults.buildingAddress as string) ?? "");
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(() => {
    const lat = defaults.gpsLatitude;
    const lng = defaults.gpsLongitude;
    if (lat == null || lng == null || lat === "" || lng === "") return null;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  });
  const [gpsPlaceName, setGpsPlaceName] = useState<string | null>(
    defaultBuildingAddressMode === "gps" ? ((defaults.buildingAddress as string) ?? null) : null,
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsPlaceLoading, setGpsPlaceLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  async function resolvePlaceName(coords: GpsCoords) {
    setGpsPlaceLoading(true);
    const placeName = await reverseGeocodePlaceAction(coords.latitude, coords.longitude);
    setGpsPlaceName(placeName);
    setGpsPlaceLoading(false);
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsError("Shfletuesi juaj nuk mbështet gjetjen e vendndodhjes.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setGpsCoords(null);
    setGpsPlaceName(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setGpsCoords(coords);
        setGpsLoading(false);
        void resolvePlaceName(coords);
      },
      (positionError) => {
        setGpsLoading(false);
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setGpsError("Lejoni aksesin te vendndodhja për të vazhduar.");
        } else {
          setGpsError("Nuk u lexua vendndodhja. Provoni përsëri ose shkruani adresën.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function submit(saveAsDraft: boolean) {
    setError(null);
    if (!elevatorInServiceDate.trim() || !elevatorCondition) {
      setError("Plotësoni datën e instalimit të ashensorit për të përcaktuar nëse është i ri apo ekzistues.");
      return;
    }
    if (buildingAddressMode === "gps" && !gpsCoords) {
      setError("Përdorni vendndodhjen time ose shkruani adresën.");
      return;
    }
    const form = document.getElementById("reg-basic-form") as HTMLFormElement;
    const fd = new FormData(form);
    fd.set("saveAsDraft", saveAsDraft ? "true" : "false");
    const result = await saveRegistrationBasicDataAction(applicationId, fd);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function fillWithDummyData() {
    const form = document.getElementById("reg-basic-form") as HTMLFormElement | null;
    if (!form) return;

    const dummy = buildRegistrationBasicDataDummy({
      municipalities,
      ownerName: (defaults.responsibleEntityName as string) ?? undefined,
      ownerNipt: (defaults.responsibleEntityIdentifier as string) ?? undefined,
      ownerEmail: (defaults.responsibleEntityEmail as string) ?? undefined,
      ownerPhone: (defaults.responsibleEntityPhone as string) ?? undefined,
    });

    setElevatorInServiceDate(dummy.elevatorInServiceDate);
    setElevatorCondition(dummy.elevatorConditionType);
    setApplicationSubtype(
      dummy.applicationSubtype === "ADDITIONAL" ? "ADDITIONAL" : "FIRST",
    );
    setUsagePurposeCode(dummy.usagePurposeCode);
    setBuildingAddressMode("text");
    setBuildingAddress(dummy.buildingAddress);
    setGpsCoords(null);
    setGpsPlaceName(null);
    setGpsError(null);

    applyValuesToForm(form, dummy);
    setFillHint("U plotësuan fushat demo. Kontrolloni dhe shtypni Ruaj ose Vazhdo.");
    setError(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  const hasSystemPrefill =
    Boolean(defaults.responsibleEntityName) ||
    Boolean(defaults.responsibleEntityIdentifier) ||
    Boolean(ext.applicationSubtype) ||
    Boolean(defaults.municipalityId) ||
    Boolean(defaults.buildingAddress);

  return (
    <form id="reg-basic-form" className="space-y-2" onSubmit={(e) => e.preventDefault()}>
      {showDemoTools && editMode === "wizard" && (
        <div className="mb-4 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/50 px-3 py-2.5">
          <button type="button" onClick={() => void fillWithDummyData()} className="workflow-demo-btn">
            <FlaskConical className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            Mbush me të dhëna demo
          </button>
          {fillHint && <p className="mt-1 text-xs text-green-700">{fillHint}</p>}
        </div>
      )}

      {hasSystemPrefill && (
        <p className="mb-4 text-xs text-muted-foreground">
          Disa fusha u plotësuan automatikisht nga sistemi.
        </p>
      )}

      <FormStep step={1} title="Aplikimi">
        <input
          type="hidden"
          name="applicationDate"
          value={(defaults.applicationDate as string)?.slice(0, 10) ?? today}
        />
        <RegistrationFieldGrid columns={2}>
          <Field label="Data e instalimit të ashensorit dhe vënies në shërbim" required>
            <Input
              name="elevatorInServiceDate"
              type="date"
              required
              value={elevatorInServiceDate}
              onChange={(e) => handleInServiceDateChange(e.target.value)}
            />
          </Field>

          <div className="md:col-span-2 rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Ashensori është *</Label>
              <p className="text-xs text-muted-foreground">
                Plotësohet vetë në varësi të datës së instalimit.
              </p>
            </div>
            <input type="hidden" name="elevatorConditionType" value={elevatorCondition} />
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: "NEW" as const,
                    label: "I RI",
                    description: "Instaluar nga 1 janar 2020 e në vazhdim",
                  },
                  {
                    value: "EXISTING" as const,
                    label: "EKZISTUES",
                    description: "Instaluar para 31 dhjetor 2019",
                  },
                ] as const
              ).map(({ value, label, description }) => {
                const selected = elevatorCondition === value;
                return (
                  <div
                    key={value}
                    className={cn(
                      "rounded-md border px-3 py-2.5 transition-colors",
                      selected
                        ? "border-gov-primary bg-gov-primary/10"
                        : "border-border/70 bg-background/80 opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                          selected ? "border-gov-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {selected ? <span className="h-2 w-2 rounded-full bg-gov-primary" /> : null}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          selected ? "text-gov-primary" : "text-foreground",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 pl-6 text-xs",
                        selected ? "text-gov-primary/90" : "text-muted-foreground",
                      )}
                    >
                      {description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Lloji i aplikimit *</Label>
              <p className="text-xs text-muted-foreground">
                Merret automatikisht nga sistemi sipas regjistrit tuaj.
              </p>
            </div>
            <input type="hidden" name="applicationSubtype" value={applicationSubtype} />
            {applicationSubtype === "ADDITIONAL" && (
              <input
                type="hidden"
                name="existingRegisteredElevatorsCount"
                value={defaultExistingRegisteredCount}
              />
            )}
            <div className="grid gap-2 sm:grid-cols-1">
              {(
                [
                  {
                    value: "FIRST" as const,
                    label: APPLICATION_SUBTYPE_LABELS.FIRST,
                    description: "Nuk keni ashensorë të r.",
                  },
                  {
                    value: "ADDITIONAL" as const,
                    label: APPLICATION_SUBTYPE_LABELS.ADDITIONAL,
                    description: "Keni të paktën një ashensor të regjistruar më parë.",
                  },
                ] as const
              ).map(({ value, label, description }) => {
                const selected = applicationSubtype === value;
                return (
                  <div
                    key={value}
                    className={cn(
                      "rounded-md border px-3 py-2.5 transition-colors",
                      selected
                        ? "border-gov-primary bg-gov-primary/10"
                        : "border-border/70 bg-background/80 opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                          selected ? "border-gov-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {selected ? <span className="h-2 w-2 rounded-full bg-gov-primary" /> : null}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          selected ? "text-gov-primary" : "text-foreground",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 pl-6 text-xs",
                        selected ? "text-gov-primary/90" : "text-muted-foreground",
                      )}
                    >
                      {description}
                    </p>
                  </div>
                );
              })}
            </div>
            {applicationSubtype === "ADDITIONAL" && defaultExistingRegisteredCount && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Ashensorë të regjistruar më parë</p>
                <p className="text-sm font-medium text-foreground">{defaultExistingRegisteredCount}</p>
              </div>
            )}
          </div>
        </RegistrationFieldGrid>
      </FormStep>

      <FormStep
        step={2}
        title="Personi përgjegjës i ashensorit"
        description={
          responsibleFromProfile ? undefined : "Kontakti dhe identifikimi i subjektit përgjegjës."
        }
      >
        {responsibleFromProfile ? (
          <>
            <input type="hidden" name="responsibleEntityType" value={responsibleEntityType} />
            <input type="hidden" name="responsibleEntityName" value={responsibleName} />
            <input type="hidden" name="responsibleIdentifierType" value={responsibleIdentifierType} />
            <input type="hidden" name="responsibleIdentifier" value={identifier} />
            <input type="hidden" name="responsiblePhone" value={responsiblePhone} />
            <input type="hidden" name="responsibleEmail" value={responsibleEmail} />
            {!isAdministrator && <input type="hidden" name="representedBy" value={representedBy} />}

            <p className="mb-4 text-xs text-muted-foreground">
              Për ndryshime, shkoni te{" "}
              <Link href="/portal/profile" className="font-medium text-gov-primary underline-offset-2 hover:underline">
                Profili
              </Link>
              .
            </p>

            <RegistrationFieldGrid columns={2}>
              {isCompanySubject ? (
                <>
                  <SubFormSection title={PROFILE_SECTION_TITLES.ownerSubject}>
                    <Field label="Lloji i subjektit">
                      <ReadOnlyValue value={applicationOwnerEntityTypeLabel(responsibleEntityType as typeof APPLICATION_OWNER_ENTITY_TYPES[number])} />
                    </Field>
                    <Field label="Emri i subjektit">
                      <ReadOnlyValue value={responsibleName} />
                    </Field>
                    <Field label="NIPT">
                      <ReadOnlyValue value={identifier} />
                    </Field>
                  </SubFormSection>

                  <SubFormSection title={PROFILE_SECTION_TITLES.ownerContact}>
                    <Field label="Emri">
                      <ReadOnlyValue value={representedBy} />
                    </Field>
                    <Field label="Telefoni">
                      <ReadOnlyValue value={responsiblePhone} />
                    </Field>
                    <Field label="Email">
                      <ReadOnlyValue value={responsibleEmail} />
                    </Field>
                  </SubFormSection>
                </>
              ) : (
                <>
                  <Field label="Lloji i subjektit">
                    <ReadOnlyValue value={applicationOwnerEntityTypeLabel(responsibleEntityType as typeof APPLICATION_OWNER_ENTITY_TYPES[number])} />
                  </Field>
                  <Field label="Emri">
                    <ReadOnlyValue value={responsibleName} />
                  </Field>
                  <Field label="NID">
                    <ReadOnlyValue value={identifier} />
                  </Field>
                  <Field label="Telefoni">
                    <ReadOnlyValue value={responsiblePhone} />
                  </Field>
                  <Field label="Email">
                    <ReadOnlyValue value={responsibleEmail} />
                  </Field>
                </>
              )}
            </RegistrationFieldGrid>
          </>
        ) : (
          <RegistrationFieldGrid columns={2}>
            {isCompanySubject ? (
              <>
                <SubFormSection title={PROFILE_SECTION_TITLES.ownerSubject}>
                  <Field label="Lloji i subjektit" required>
                    <RegistrationSelect name="responsibleEntityType" defaultValue={responsibleEntityType} required>
                      {APPLICATION_OWNER_ENTITY_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {applicationOwnerEntityTypeLabel(value)}
                        </option>
                      ))}
                    </RegistrationSelect>
                  </Field>
                  <Field label="Emri i subjektit" required>
                    <Input name="responsibleEntityName" defaultValue={responsibleName} required />
                  </Field>
                  <Field label="NIPT" required>
                    <input type="hidden" name="responsibleIdentifierType" value="NIPT" />
                    <Input name="responsibleIdentifier" defaultValue={identifier} required />
                  </Field>
                </SubFormSection>

                <SubFormSection title={PROFILE_SECTION_TITLES.ownerContact}>
                  <Field label="Emri" required>
                    <Input name="representedBy" defaultValue={representedBy} required />
                  </Field>
                  <Field label="Telefoni" required>
                    <Input name="responsiblePhone" defaultValue={responsiblePhone} required />
                  </Field>
                  <Field label="Email" required>
                    <Input name="responsibleEmail" type="email" defaultValue={responsibleEmail} required />
                  </Field>
                </SubFormSection>
              </>
            ) : (
              <>
                <Field label="Lloji i subjektit" required>
                  <RegistrationSelect name="responsibleEntityType" defaultValue={responsibleEntityType} required>
                    {APPLICATION_OWNER_ENTITY_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {applicationOwnerEntityTypeLabel(value)}
                      </option>
                    ))}
                  </RegistrationSelect>
                </Field>
                <Field label="Emri" required>
                  <Input name="responsibleEntityName" defaultValue={responsibleName} required />
                </Field>
                <Field label="NID" required>
                  <input type="hidden" name="responsibleIdentifierType" value="NID" />
                  <Input name="responsibleIdentifier" defaultValue={identifier} required />
                </Field>
                <Field label="Telefoni" required>
                  <Input name="responsiblePhone" defaultValue={responsiblePhone} required />
                </Field>
                <Field label="Email" required>
                  <Input name="responsibleEmail" type="email" defaultValue={responsibleEmail} required />
                </Field>
              </>
            )}
          </RegistrationFieldGrid>
        )}
      </FormStep>

      <FormStep step={3} title="Godina" description="Vendndodhja e ashensorit në ndërtesë.">
        <input type="hidden" name="buildingAddressMode" value={buildingAddressMode} />
        <input type="hidden" name="gpsLatitude" value={gpsCoords?.latitude ?? ""} />
        <input type="hidden" name="gpsLongitude" value={gpsCoords?.longitude ?? ""} />
        <input type="hidden" name="municipalityId" value={initialMunicipalityId} />
        <input type="hidden" name="administrativeUnitId" value={initialAdminUnitId} />

        <RegistrationFieldGrid columns={2}>
          <Field label="Emri i godinës">
            <Input name="buildingName" defaultValue={defaults.buildingName as string ?? ""} />
          </Field>

          <div className="md:col-span-2 space-y-3">
            <Label className="text-sm font-medium">Adresa *</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border px-3 py-3",
                  buildingAddressMode === "text" && "border-gov-primary bg-gov-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="buildingAddressModeChoice"
                  className="mt-1"
                  checked={buildingAddressMode === "text"}
                  onChange={() => {
                    setBuildingAddressMode("text");
                    setGpsError(null);
                    setGpsCoords(null);
                    setGpsPlaceName(null);
                  }}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Shkruaj adresën</span>
                  <span className="block text-xs text-muted-foreground">Rruga, ndërtesa, qyteti</span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border px-3 py-3",
                  buildingAddressMode === "gps" && "border-gov-primary bg-gov-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="buildingAddressModeChoice"
                  className="mt-1"
                  checked={buildingAddressMode === "gps"}
                  onChange={() => {
                    setBuildingAddressMode("gps");
                    setGpsError(null);
                    setGpsCoords(null);
                    setGpsPlaceName(null);
                  }}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Përdor vendndodhjen time</span>
                  <span className="block text-xs text-muted-foreground">Nga telefoni ose pajisja juaj</span>
                </span>
              </label>
            </div>

            {buildingAddressMode === "text" ? (
              <Input
                name="buildingAddress"
                value={buildingAddress}
                onChange={(e) => setBuildingAddress(e.target.value)}
                placeholder="Adresa, ndërtesa, qyteti"
                required
              />
            ) : (
              <div className="space-y-3 rounded-md border border-border p-3">
                {!gpsCoords ? (
                  <p className="text-sm text-muted-foreground">
                    Lejoni aksesin te vendndodhja.
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={captureGps}
                  disabled={gpsLoading || gpsPlaceLoading}
                >
                  {gpsLoading
                    ? "Duke lexuar vendndodhjen…"
                    : gpsCoords
                      ? "Përditëso vendndodhjen"
                      : "Përdor vendndodhjen time"}
                </Button>
                {gpsCoords ? (
                  <div className="space-y-2 text-sm">
                    {gpsPlaceLoading ? (
                      <p className="text-muted-foreground">Duke gjetur adresën…</p>
                    ) : gpsPlaceName ? (
                      (() => {
                        const { headline, details } = splitReverseGeocodeLabel(gpsPlaceName);
                        return (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{headline}</p>
                            {details.length > 0 ? (
                              <p className="text-muted-foreground">{details.join(", ")}</p>
                            ) : null}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-muted-foreground">
                        Adresa nuk u gjet, por vendndodhja u ruajt.
                      </p>
                    )}
                    <a
                      href={mapsUrlForCoords(gpsCoords)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-primary hover:underline"
                    >
                      Shiko në hartë
                    </a>
                  </div>
                ) : null}
                <input type="hidden" name="buildingAddress" value={gpsPlaceName ?? buildingAddress} />
                {gpsError ? <p className="text-sm text-destructive">{gpsError}</p> : null}
              </div>
            )}
          </div>

          {layoutPlanSlot && (
            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm font-medium">Planvendosje në ndërtesë *</Label>
              <p className="text-xs text-muted-foreground">
                Dokumenti që tregon pozicionin e ashensorit në ndërtesë.
              </p>
              {layoutPlanSlot}
            </div>
          )}
        </RegistrationFieldGrid>
      </FormStep>

      <FormStep step={4} title="Lloji dhe përdorimi" description="Ku është instaluar ashensori dhe për çfarë përdoret.">
        <RegistrationFieldGrid columns={2}>
          <Field label="Instaluar në" required>
            <RegistrationSelect
              name="registrationBuildingType"
              defaultValue={ext.registrationBuildingType ?? ""}
              required
            >
              <option value="">Zgjidhni</option>
              {Object.entries(REGISTRATION_BUILDING_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </RegistrationSelect>
          </Field>
          <Field label="Qëllimi i përdorimit" required>
            <RegistrationSelect
              name="usagePurposeCode"
              value={usagePurposeCode}
              onChange={(e) => setUsagePurposeCode(e.target.value)}
              required
            >
              <option value="">Zgjidhni</option>
              {Object.entries(REGISTRATION_USAGE_PURPOSE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </RegistrationSelect>
          </Field>
          {usagePurposeCode === "TJETER" && (
            <Field label="Qëllim tjetër" required>
              <Input
                name="usagePurposeOther"
                defaultValue={ext.usagePurposeOther ?? ""}
                required
              />
            </Field>
          )}
        </RegistrationFieldGrid>
      </FormStep>

      <FormStep step={5} title="Shënime (opsionale)" last={!documentsSlot}>
        <textarea
          name="ownerNotes"
          defaultValue={(defaults.ownerNotes as string) ?? ""}
          className="min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Shënime shtesë për aplikimin…"
        />
      </FormStep>

      {documentsSlot && (
        <div className="border-t border-border/60 pt-5">
          <FormDocumentsSection title="Dokumentet e detyrueshme">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Dokumentet e tjera duhen ngarkuar këtu para se të vazhdoni te instaluesi.
              </p>
              {documentsSlot}
            </div>
          </FormDocumentsSection>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <RegistrationStepActions
        hint={editMode === "wizard" ? "Ruajeni draftin në çdo kohë, ose vazhdoni te hapi tjetër kur jeni gati." : undefined}
      >
        {editMode === "pre-submit" ? (
          <Button type="button" className="rounded-lg bg-gov-primary hover:bg-gov-secondary" onClick={() => submit(true)}>
            Ruaj ndryshimet
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => submit(true)}>
              Ruaj draft
            </Button>
            <Button type="button" className="rounded-lg bg-gov-primary hover:bg-gov-secondary" onClick={() => submit(false)}>
              Vazhdo te instaluesi →
            </Button>
          </>
        )}
      </RegistrationStepActions>
    </form>
  );
}
