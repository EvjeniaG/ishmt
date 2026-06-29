"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { saveRegistrationBasicDataAction } from "@/lib/actions/registration-actions";
import {
  APPLICATION_SUBTYPE_LABELS,
  ELEVATOR_CONDITION_LABELS,
  IDENTIFIER_TYPE_LABELS,
  REGISTRATION_BUILDING_TYPE_LABELS,
  REGISTRATION_USAGE_PURPOSE_LABELS,
  RESPONSIBLE_ENTITY_TYPE_LABELS,
} from "@/lib/registration/labels";
import { buildRegistrationBasicDataDummy } from "@/lib/demo/registration-basic-data-dummy";
import { isDemoToolsEnabled } from "@/lib/demo/registration-demo-steps";
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

type AdminUnitOption = { id: string; nameSq: string };

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
  adminUnits,
  defaults,
  documentsSlot,
  editMode = "wizard",
}: {
  applicationId: string;
  municipalities: MunicipalityOption[];
  adminUnits: AdminUnitOption[];
  defaults: Defaults;
  documentsSlot?: React.ReactNode;
  editMode?: "wizard" | "pre-submit";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ext = (defaults.registrationExtendedData as Record<string, string> | null) ?? {};

  const initialMunicipalityId = (defaults.municipalityId as string) ?? "";

  const NIPT_REGEX = /^[A-Z][0-9]{8}[A-Z]$/;
  const [identifierType, setIdentifierType] = useState<string>(ext.responsibleIdentifierType ?? "NIPT");
  const [identifier, setIdentifier] = useState<string>((defaults.responsibleEntityIdentifier as string) ?? "");
  const [municipalityId, setMunicipalityId] = useState(initialMunicipalityId);
  const [adminUnitId, setAdminUnitId] = useState((defaults.administrativeUnitId as string) ?? "");
  const [adminUnitsList, setAdminUnitsList] = useState<AdminUnitOption[]>(adminUnits);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [fillHint, setFillHint] = useState<string | null>(null);
  const showDemoTools = isDemoToolsEnabled();
  const niptCheck =
    identifierType === "NIPT" && identifier.trim().length > 0
      ? NIPT_REGEX.test(identifier.trim().toUpperCase())
      : null;

  async function submit(saveAsDraft: boolean) {
    setError(null);
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

  const fetchAdminUnits = useCallback(async (munId: string, preferredUnitId?: string) => {
    if (!munId) {
      setAdminUnitsList([]);
      setAdminUnitId("");
      return [] as AdminUnitOption[];
    }

    setLoadingUnits(true);
    try {
      const res = await fetch(`/api/geo/administrative-units?municipalityId=${encodeURIComponent(munId)}`);
      if (!res.ok) {
        setAdminUnitsList([]);
        setAdminUnitId("");
        return [];
      }
      const data: unknown = await res.json();
      const units = Array.isArray(data) ? (data as AdminUnitOption[]) : [];
      setAdminUnitsList(units);
      if (preferredUnitId && units.some((u) => u.id === preferredUnitId)) {
        setAdminUnitId(preferredUnitId);
      } else {
        setAdminUnitId(units[0]?.id ?? "");
      }
      return units;
    } catch {
      setAdminUnitsList([]);
      setAdminUnitId("");
      return [];
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  useEffect(() => {
    if (!municipalityId) return;
    if (adminUnitsList.length > 0) return;
    void fetchAdminUnits(municipalityId, adminUnitId || undefined);
  }, [municipalityId, adminUnitId, adminUnitsList.length, fetchAdminUnits]);

  useEffect(() => {
    if (adminUnitsList.length === 0 || !adminUnitId) return;
    if (adminUnitsList.some((u) => u.id === adminUnitId)) return;
    setAdminUnitId(adminUnitsList[0]?.id ?? "");
  }, [adminUnitsList, adminUnitId]);

  function handleMunicipalityChange(munId: string) {
    setMunicipalityId(munId);
    setAdminUnitsList([]);
    setAdminUnitId("");
    void fetchAdminUnits(munId);
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

    setIdentifierType(dummy.responsibleIdentifierType);
    setIdentifier(dummy.responsibleIdentifier);
    setMunicipalityId(dummy.municipalityId);

    const units = await fetchAdminUnits(dummy.municipalityId);
    const unitId = units[0]?.id ?? "";

    applyValuesToForm(form, {
      ...dummy,
      administrativeUnitId: unitId,
    });
    setFillHint("U plotësuan fushat demo. Kontrolloni dhe shtypni Ruaj ose Vazhdo.");
    setError(null);
  }

  const today = new Date().toISOString().slice(0, 10);

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

      <FormStep step={1} title="Aplikimi" description="Data, lloji i ashensorit dhe nënlloji i kërkesës.">
        <RegistrationFieldGrid columns={2}>
          <Field label="Data e aplikimit" required>
            <Input name="applicationDate" type="date" defaultValue={(defaults.applicationDate as string)?.slice(0, 10) ?? today} required />
          </Field>
          <Field label="Ashensori është" required>
            <div className="flex flex-wrap gap-4">
              {Object.entries(ELEVATOR_CONDITION_LABELS).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="elevatorConditionType" value={v} defaultChecked={ext.elevatorConditionType === v} required /> {l}
                </label>
              ))}
            </div>
          </Field>
          <div className="md:col-span-2 space-y-2">
            <Label className="text-sm font-medium">Lloji i aplikimit *</Label>
            {Object.entries(APPLICATION_SUBTYPE_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="applicationSubtype" value={v} defaultChecked={ext.applicationSubtype === v} required /> {l}
              </label>
            ))}
          </div>
          <Field label="Ashensorë të regjistruar më parë" helper="Vetëm për aplikim shtesë">
            <Input name="existingRegisteredElevatorsCount" type="number" min={0} defaultValue={ext.existingRegisteredElevatorsCount != null ? String(ext.existingRegisteredElevatorsCount) : undefined} />
          </Field>
        </RegistrationFieldGrid>
      </FormStep>

      <FormStep step={2} title="Personi përgjegjës i ashensorit" description="Kontakti dhe identifikimi i subjektit përgjegjës.">
        <RegistrationFieldGrid columns={2}>
          <Field label="Lloji i subjektit" required>
            <RegistrationSelect name="responsibleEntityType" defaultValue={ext.responsibleEntityType ?? ""} required>
              <option value="">Zgjidhni</option>
              {Object.entries(RESPONSIBLE_ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </RegistrationSelect>
          </Field>
          <Field label="Emri" required>
            <Input name="responsibleEntityName" defaultValue={defaults.responsibleEntityName as string ?? ""} required />
          </Field>
          <Field label="Lloji i identifikuesit" required>
            <RegistrationSelect
              name="responsibleIdentifierType"
              value={identifierType}
              onChange={(e) => setIdentifierType(e.target.value)}
              required
            >
              {Object.entries(IDENTIFIER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </RegistrationSelect>
          </Field>
          <Field label="NID / NIPT" required helper={identifierType === "NIPT" ? "Format: K12345678L" : undefined}>
            <Input
              name="responsibleIdentifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
              required
              className={
                niptCheck === true ? "border-green-500" : niptCheck === false ? "border-red-500" : undefined
              }
            />
          </Field>
          <Field label="Adresa" required>
            <Input name="responsibleAddress" defaultValue={ext.responsibleAddress ?? ""} required />
          </Field>
          <Field label="Telefoni" required>
            <Input name="responsiblePhone" defaultValue={defaults.responsibleEntityPhone as string ?? ""} required />
          </Field>
          <Field label="Email" required>
            <Input name="responsibleEmail" type="email" defaultValue={defaults.responsibleEntityEmail as string ?? ""} required />
          </Field>
          <Field label="Përfaqësuar nga">
            <Input name="representedBy" defaultValue={ext.representedBy ?? ""} />
          </Field>
          <Field label="Pozicioni">
            <Input name="representativePosition" defaultValue={ext.representativePosition ?? ""} />
          </Field>
        </RegistrationFieldGrid>
      </FormStep>

      <FormStep step={3} title="Godina" description="Vendndodhja e ashensorit në ndërtesë.">
        <RegistrationFieldGrid columns={2}>
          <Field label="Emri i godinës"><Input name="buildingName" defaultValue={defaults.buildingName as string ?? ""} /></Field>
          <Field label="Adresa" required>
            <Input name="buildingAddress" defaultValue={defaults.buildingAddress as string ?? ""} required />
          </Field>
          <Field label="Bashkia" required>
            <RegistrationSelect
              name="municipalityId"
              value={municipalityId}
              onChange={(e) => handleMunicipalityChange(e.target.value)}
              required
            >
              <option value="">Zgjidhni bashkinë</option>
              {municipalityId && !municipalities.some((m) => m.id === municipalityId) && (
                <option value={municipalityId}>Bashkia e ruajtur</option>
              )}
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.nameSq}</option>
              ))}
            </RegistrationSelect>
          </Field>
          <Field
            label="Njësia administrative"
            helper={
              loadingUnits
                ? "Duke ngarkuar…"
                : municipalityId && adminUnitsList.length === 0
                  ? "Nuk ka njësi për këtë bashki."
                  : undefined
            }
          >
            <RegistrationSelect
              name="administrativeUnitId"
              value={adminUnitId}
              onChange={(e) => setAdminUnitId(e.target.value)}
              disabled={!municipalityId || loadingUnits || adminUnitsList.length === 0}
            >
              <option value="">
                {!municipalityId ? "Zgjidhni bashkinë" : adminUnitsList.length === 0 ? "-" : "Zgjidhni"}
              </option>
              {adminUnitId && !adminUnitsList.some((u) => u.id === adminUnitId) && (
                <option value={adminUnitId}>Njësia e ruajtur</option>
              )}
              {adminUnitsList.map((u) => (
                <option key={u.id} value={u.id}>{u.nameSq}</option>
              ))}
            </RegistrationSelect>
          </Field>
          <Field label="Hyrja"><Input name="entrance" defaultValue={defaults.entrance as string ?? ""} /></Field>
          <Field label="Pozicioni i ashensorit" helper="Sipas planvendosjes">
            <Input name="specificPosition" defaultValue={defaults.specificPosition as string ?? ""} />
          </Field>
        </RegistrationFieldGrid>
      </FormStep>

      <FormStep step={4} title="Lloji dhe përdorimi" description="Ku është instaluar ashensori dhe për çfarë përdoret.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Instaluar në *</Label>
            {Object.entries(REGISTRATION_BUILDING_TYPE_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="registrationBuildingType" value={v} defaultChecked={ext.registrationBuildingType === v} required /> {l}
              </label>
            ))}
          </div>
          <RegistrationFieldGrid columns={2}>
            <Field label="Natyra e përdorimit" required>
              <Input name="buildingMainUse" defaultValue={ext.buildingMainUse ?? ""} required />
            </Field>
            <Field label="Emri tregtar (vend pune)"><Input name="businessNameIfWorkplace" defaultValue={ext.businessNameIfWorkplace ?? ""} /></Field>
            <Field label="NIPT (vend pune)"><Input name="businessNiptIfWorkplace" defaultValue={ext.businessNiptIfWorkplace ?? ""} /></Field>
          </RegistrationFieldGrid>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Qëllimi i përdorimit *</Label>
            {Object.entries(REGISTRATION_USAGE_PURPOSE_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="usagePurposeCode" value={v} defaultChecked={ext.usagePurposeCode === v} required /> {l}
              </label>
            ))}
          </div>
          <Field label="Qëllim tjetër"><Input name="usagePurposeOther" defaultValue={ext.usagePurposeOther ?? ""} /></Field>
        </div>
      </FormStep>

      <FormStep step={5} title="Shënime" last={!documentsSlot}>
        <Field label="Shënime (opsionale)">
          <textarea name="ownerNotes" defaultValue={(defaults.ownerNotes as string) ?? ""} className="min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm" />
        </Field>
      </FormStep>

      {documentsSlot && (
        <div className="border-t border-border/60 pt-5">
          <FormDocumentsSection title="Dokumentet e detyrueshme">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Planvendosja dhe dokumentet e tjera duhen ngarkuar këtu para se të vazhdoni te instaluesi.
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
