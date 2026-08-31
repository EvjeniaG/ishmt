"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { lookupCompanyNiptAction, registerAccountAction, fetchRegisterDemoCompanyPrefillAction } from "@/lib/actions/auth-actions";
import {
  buildRegisterDemoData,
  isRegisterDemoEnabled,
  REGISTER_DEMO_PASSWORD,
} from "@/lib/demo/register-demo-data";
import { savePostRegisterCredentials } from "@/lib/auth/post-register-credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ownerRequiresNipt,
  ownerSubjectNameRequired,
  REGISTER_OWNER_ENTITY_TYPES,
  registerOwnerEntityTypeLabel,
  type RegisterOwnerEntityType,
} from "@/lib/registration/owner-entity-role";
import { TermsAcceptanceLabel } from "@/components/forms/terms-acceptance-label";
import { PROFILE_SECTION_TITLES } from "@/lib/registration/profile-sections";
import type { LicensedCompanyLookupStatus, NiptLookupStatus } from "@/lib/services/licensed-company-registration-service";
import type { CompanyCapabilityName } from "@/components/forms/company-capability-selector";
import {
  REGISTER_DEMO_COMPANY_OPTIONS,
  REGISTER_DEMO_OWNER_OPTIONS,
  defaultRegisterDemoSelection,
  ownerRoleForDemoMode,
  registerDemoSelectionLabel,
  type RegisterDemoSelection,
  type RegisterDemoOwnerMode,
} from "@/lib/demo/register-demo-modes";
import type { RegisterDemoCompanyMode } from "@/lib/demo/register-demo-prefill-service";
import {
  isNiptReadyForRegistration,
  niptRegistrationFeedbackMessage,
} from "@/lib/registration/nipt-registration-feedback";

type Level = "OWNER" | "COMPANY";

const LEVELS: { value: Level; label: string }[] = [
  { value: "OWNER", label: "Personi përgjegjës i ashensorit" },
  { value: "COMPANY", label: "Kompani shërbimi (instalim / mirëmbajtje / OM)" },
];

const inputClass = "h-9 text-sm";
const labelClass = "text-xs";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

export function RegisterAccountForm({
  initialLevel = "OWNER",
  initialDemoCompanyMode = "install",
  initialDemoOwnerMode,
}: {
  initialLevel?: Level;
  initialDemoCompanyMode?: RegisterDemoCompanyMode;
  initialDemoOwnerMode?: RegisterDemoOwnerMode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<Level>(initialLevel);
  const [selectedCaps, setSelectedCaps] = useState<CompanyCapabilityName[]>([]);
  const [ownerEntityType, setOwnerEntityType] = useState<RegisterOwnerEntityType>(
    initialDemoOwnerMode ? ownerRoleForDemoMode(initialDemoOwnerMode) : "ADMINISTRATOR",
  );
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [installLicenseNumber, setInstallLicenseNumber] = useState("");
  const [installLicenseStatus, setInstallLicenseStatus] = useState<LicensedCompanyLookupStatus | null>(null);
  const [omLicenseNumber, setOmLicenseNumber] = useState("");
  const [omLicenseStatus, setOmLicenseStatus] = useState<LicensedCompanyLookupStatus | null>(null);
  const [companyNipt, setCompanyNipt] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [niptRevision, setNiptRevision] = useState(0);
  const [niptLookupStatus, setNiptLookupStatus] = useState<NiptLookupStatus | null>(null);
  const [niptChecking, setNiptChecking] = useState(false);
  const [wantMaintenance, setWantMaintenance] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [omAlternateNipt, setOmAlternateNipt] = useState<string | null>(null);
  const [demoFill, setDemoFill] = useState<{ id: number; values: Record<string, string> } | null>(
    null,
  );
  const [demoSelection, setDemoSelection] = useState<RegisterDemoSelection>(() =>
    defaultRegisterDemoSelection({
      companyMode: initialDemoCompanyMode,
      ownerMode: initialDemoOwnerMode,
    }),
  );

  useEffect(() => {
    setDemoSelection(
      defaultRegisterDemoSelection({
        companyMode: initialDemoCompanyMode,
        ownerMode: initialDemoOwnerMode,
      }),
    );
  }, [initialDemoCompanyMode, initialDemoOwnerMode]);

  const isCompany = level === "COMPANY";
  const showDemoTools = isRegisterDemoEnabled();
  const ownerNeedsNipt = level === "OWNER" && ownerRequiresNipt(ownerEntityType);
  const ownerNeedsSubjectName = level === "OWNER" && ownerSubjectNameRequired(ownerEntityType);
  const demoDefault = (name: string) => demoFill?.values[name];

  const niptFeedback = niptRegistrationFeedbackMessage(niptLookupStatus);
  const isDirectorateRegistration = niptLookupStatus?.status === "DIRECTORATE_REGISTERED";
  const isMaintenanceOnlyRegistration = niptLookupStatus?.status === "NOT_IN_DIRECTORATE";

  function applyRegistrationCapsFromNipt(
    lookup: NiptLookupStatus,
    includeMaintenance: boolean,
  ) {
    if (lookup.status === "DIRECTORATE_REGISTERED") {
      const caps: CompanyCapabilityName[] = [];
      if (lookup.capabilities.capInstall) caps.push("capInstall");
      if (lookup.capabilities.capOm) caps.push("capOm");
      if (includeMaintenance) caps.push("capMaintenance");
      setSelectedCaps(caps);
      setOrganizationName(lookup.orgName);
      setInstallLicenseNumber(lookup.licenses.installLicenseNumber ?? "");
      setOmLicenseNumber(lookup.licenses.omLicenseNumber ?? "");
      setInstallLicenseStatus(
        lookup.capabilities.capInstall
          ? {
              status: "AVAILABLE",
              orgName: lookup.orgName,
              nipt: lookup.nipt,
              niptVerified: true,
              directorateRegistered: true,
              capabilities: {
                capInstall: true,
                capMaintenance: includeMaintenance,
                capOm: lookup.capabilities.capOm,
              },
              licenses: lookup.licenses,
            }
          : null,
      );
      setOmLicenseStatus(
        lookup.capabilities.capOm
          ? {
              status: "AVAILABLE",
              orgName: lookup.orgName,
              nipt: lookup.nipt,
              niptVerified: true,
              directorateRegistered: true,
              capabilities: {
                capInstall: lookup.capabilities.capInstall,
                capMaintenance: includeMaintenance,
                capOm: true,
              },
              licenses: lookup.licenses,
            }
          : null,
      );
      return;
    }

    if (lookup.status === "NOT_IN_DIRECTORATE") {
      setSelectedCaps(["capMaintenance"]);
      setInstallLicenseNumber("");
      setOmLicenseNumber("");
      setInstallLicenseStatus(null);
      setOmLicenseStatus(null);
    }
  }

  async function refreshNiptLookup(nipt: string, includeMaintenance = wantMaintenance) {
    const trimmed = nipt.trim();
    if (trimmed.length < 8) {
      setNiptLookupStatus(null);
      setSelectedCaps([]);
      return;
    }

    setNiptChecking(true);
    const result = await lookupCompanyNiptAction(trimmed);
    setNiptChecking(false);

    if (!result.success) {
      setNiptLookupStatus(null);
      return;
    }

    setNiptLookupStatus(result.data);
    applyRegistrationCapsFromNipt(result.data, includeMaintenance);
  }

  useEffect(() => {
    if (!isCompany) {
      setNiptLookupStatus(null);
      setNiptChecking(false);
      return;
    }

    let cancelled = false;
    const trimmed = companyNipt.trim();
    if (trimmed.length < 8) {
      setNiptLookupStatus(null);
      setSelectedCaps([]);
      setNiptChecking(false);
      return;
    }

    setNiptChecking(true);
    const timer = window.setTimeout(() => {
      void refreshNiptLookup(trimmed, wantMaintenance).finally(() => {
        if (!cancelled) setNiptChecking(false);
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isCompany, companyNipt, niptRevision, wantMaintenance]);

  function resetDemoFill() {
    setDemoFill(null);
    setDemoHint(null);
  }

  function clearFormFields(options?: { level?: Level; ownerEntityType?: RegisterOwnerEntityType }) {
    resetDemoFill();

    const form = formRef.current;
    if (!form) return;

    const keepLevel = options?.level ?? level;
    const keepOwnerType = options?.ownerEntityType ?? ownerEntityType;
    form.reset();

    const levelField = form.elements.namedItem("level");
    if (levelField instanceof HTMLSelectElement) {
      levelField.value = keepLevel;
    }
    if (keepLevel === "OWNER") {
      const roleField = form.elements.namedItem("ownerBuildingRole");
      if (roleField instanceof HTMLSelectElement) {
        roleField.value = keepOwnerType;
      }
    }
  }

  async function fillDemoData() {
    setError(null);

    if (demoSelection.category === "company") {
      setDemoLoading(true);
      const result = await fetchRegisterDemoCompanyPrefillAction(demoSelection.mode);
      setDemoLoading(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { values: data, niptLookupStatus, wantMaintenance: includeMaintenance, mode } =
        result.data;

      flushSync(() => {
        setLevel("COMPANY");
        setCompanyNipt(data.nipt ?? "");
        setOrganizationName(data.organizationName ?? "");
        setInstallLicenseNumber(data.installLicenseNumber ?? "");
        setOmLicenseNumber(data.omLicenseNumber ?? "");
        setWantMaintenance(includeMaintenance);
        setNiptLookupStatus(niptLookupStatus);
        applyRegistrationCapsFromNipt(niptLookupStatus, includeMaintenance);
        setOmAlternateNipt(null);
        setDemoFill({ id: Date.now(), values: data });
        setNiptRevision((value) => value + 1);
      });

      const modeLabel = registerDemoSelectionLabel({ category: "company", mode });
      setDemoHint(
        mode === "maintenance"
          ? `Të dhëna demo si ${modeLabel}. Hyni me NIPT: ${data.nipt} · Fjalëkalimi: ${REGISTER_DEMO_PASSWORD} · Pas regjistrimit verifikohet NIPT-i në QKB.`
          : `Të dhëna demo si ${modeLabel}. Hyni me NIPT: ${data.nipt} · Fjalëkalimi: ${REGISTER_DEMO_PASSWORD}${
              data.installLicenseNumber ? ` · Licenca instalimi: ${data.installLicenseNumber}` : ""
            }${data.omLicenseNumber ? ` · Licenca OM: ${data.omLicenseNumber}` : ""}${
              mode === "installOm" ? " · Të dyja licencat i përkasin të njëjtës kompani." : ""
            }.`,
      );
      return;
    }

    const role = ownerRoleForDemoMode(demoSelection.mode);
    const data = buildRegisterDemoData({
      level: "OWNER",
      ownerBuildingRole: role,
    });

    flushSync(() => {
      setLevel("OWNER");
      setCompanyNipt("");
      setInstallLicenseNumber("");
      setOmLicenseNumber("");
      setInstallLicenseStatus(null);
      setOmLicenseStatus(null);
      setOmAlternateNipt(null);
      setNiptLookupStatus(null);
      setSelectedCaps([]);
      setWantMaintenance(false);
      setOwnerEntityType(role);

      setDemoFill({ id: Date.now(), values: data });
      setNiptRevision((value) => value + 1);
    });

    const loginId = data.personalNumber;
    const roleLabel = registerDemoSelectionLabel(demoSelection);
    setDemoHint(
      `Të dhëna demo si ${roleLabel}. Hyni me Numrin Personal: ${loginId}${
        data.nipt ? ` · NIPT subjekti: ${data.nipt}` : ""
      } · Fjalëkalimi: ${REGISTER_DEMO_PASSWORD}`,
    );
  }

  function handleOwnerEntityTypeChange(next: RegisterOwnerEntityType) {
    setOwnerEntityType(next);
    setError(null);
    clearFormFields({ ownerEntityType: next });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isCompany) {
      if (!isNiptReadyForRegistration(niptLookupStatus)) {
        setError("Plotësoni NIPT-in dhe prisni verifikimin nga regjistri i Drejtorisë.");
        return;
      }
      if (niptLookupStatus?.status === "HAS_ACTIVE_ACCOUNT") {
        setError(niptFeedback?.text ?? "Ky NIPT ka tashmë llogari aktive.");
        return;
      }
      if (selectedCaps.length === 0) {
        setError("Nuk u përcaktuan funksione për regjistrim.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    if (isCompany) {
      fd.set("nipt", companyNipt.trim());
      fd.set("organizationName", organizationName.trim());
      fd.set("capInstall", selectedCaps.includes("capInstall") ? "true" : "false");
      fd.set("capMaintenance", selectedCaps.includes("capMaintenance") ? "true" : "false");
      fd.set("capOm", selectedCaps.includes("capOm") ? "true" : "false");
      if (installLicenseNumber.trim()) {
        fd.set("installLicenseNumber", installLicenseNumber.trim());
      }
      if (omLicenseNumber.trim()) {
        fd.set("omLicenseNumber", omLicenseNumber.trim());
      }
    }

    const result = await registerAccountAction(fd);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    const identifier = String(fd.get("nipt") || fd.get("personalNumber") || "").trim();
    const password = String(fd.get("password") || "");
    const accountType = level === "COMPANY" ? "company" : "owner";

    if (identifier && password && typeof window !== "undefined") {
      savePostRegisterCredentials({ identifier, password, accountType });
    }

    const params = new URLSearchParams({
      registered: accountType,
      ...(identifier ? { identifier } : {}),
    });
    router.push(`/auth/login?${params.toString()}`);
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Plotësoni të dhënat tuaja</CardTitle>
        <CardDescription className="text-xs">
          {isCompany
            ? "Filloni me NIPT-in - sistemi kontrollon regjistrin e Drejtorisë dhe përcakton funksionet tuaja."
            : "Emri juaj i përdoruesit do të jetë Numri Personal."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showDemoTools && (
          <div className="mb-3 rounded-md border border-dashed border-amber-300 bg-amber-50/60 p-2.5 space-y-2">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-amber-950">Person përgjegjës</p>
              <div className="flex flex-wrap gap-1.5">
                {REGISTER_DEMO_OWNER_OPTIONS.map(({ mode, role }) => {
                  const selected =
                    demoSelection.category === "owner" && demoSelection.mode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={demoLoading}
                      onClick={() => {
                        flushSync(() => {
                          setDemoSelection({ category: "owner", mode });
                          setLevel("OWNER");
                          setOwnerEntityType(role);
                        });
                        setDemoHint(null);
                        setError(null);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                        selected
                          ? "border-amber-500 bg-amber-100 font-medium text-amber-950"
                          : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                      }`}
                    >
                      {registerDemoSelectionLabel({ category: "owner", mode })}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-amber-950">Kompani shërbimi</p>
              <div className="flex flex-wrap gap-1.5">
                {REGISTER_DEMO_COMPANY_OPTIONS.map((mode) => {
                  const selected =
                    demoSelection.category === "company" && demoSelection.mode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={demoLoading}
                      onClick={() => {
                        flushSync(() => {
                          setDemoSelection({ category: "company", mode });
                          setLevel("COMPANY");
                        });
                        setDemoHint(null);
                        setError(null);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                        selected
                          ? "border-amber-500 bg-amber-100 font-medium text-amber-950"
                          : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                      }`}
                    >
                      {registerDemoSelectionLabel({ category: "company", mode })}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-400 bg-white hover:bg-amber-50"
              disabled={demoLoading}
              onClick={() => void fillDemoData()}
            >
              {demoLoading
                ? "Duke plotësuar…"
                : `Plotëso si ${registerDemoSelectionLabel(demoSelection).toLowerCase()} demo`}
            </Button>
            {demoHint && <p className="text-[11px] text-amber-900">{demoHint}</p>}
          </div>
        )}

        <form
          key={demoFill?.id ?? "register-form-empty"}
          ref={formRef}
          onSubmit={onSubmit}
          className="grid gap-3"
        >
          <div className="space-y-1">
            <Label htmlFor="level" className={labelClass}>
              Niveli i aksesit *
            </Label>
            <select
              id="level"
              name="level"
              value={level}
              onChange={(e) => {
                const nextLevel = e.target.value as Level;
                setLevel(nextLevel);
                setOwnerEntityType("ADMINISTRATOR");
                if (nextLevel === "COMPANY") {
                  setSelectedCaps([]);
                  setCompanyNipt("");
                  setOrganizationName("");
                  setNiptLookupStatus(null);
                  setWantMaintenance(false);
                }
                clearFormFields({ level: nextLevel, ownerEntityType: "ADMINISTRATOR" });
              }}
              className="flex h-9 w-full rounded-md border px-3 text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {isCompany ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="nipt" className={labelClass}>
                  NIPT *
                </Label>
                <Input
                  id="nipt"
                  name="nipt"
                  required
                  className={inputClass}
                  value={companyNipt}
                  onChange={(e) => {
                    setCompanyNipt(e.target.value);
                    setOmAlternateNipt(null);
                    setError(null);
                  }}
                  onBlur={() => setNiptRevision((value) => value + 1)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Sistemi kërkon automatikisht në regjistrin e Drejtorisë së Politikave.
                </p>
                {niptChecking && (
                  <p className="text-[11px] text-muted-foreground">Duke verifikuar NIPT-in…</p>
                )}
                {niptFeedback && (
                  <p
                    className={`text-[11px] ${
                      niptFeedback.tone === "error"
                        ? "text-destructive"
                        : niptFeedback.tone === "success"
                          ? "text-emerald-700"
                          : niptFeedback.tone === "info"
                            ? "text-sky-800"
                            : "text-muted-foreground"
                    }`}
                  >
                    {niptFeedback.text}
                  </p>
                )}
              </div>

              {isDirectorateRegistration && niptLookupStatus.status === "DIRECTORATE_REGISTERED" && (
                <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-sm font-medium text-emerald-950">Funksione të licencuara</p>
                  <ul className="space-y-1 text-xs text-emerald-900">
                    {niptLookupStatus.capabilities.capInstall && (
                      <li>✓ Instalim - licenca {niptLookupStatus.licenses.installLicenseNumber}</li>
                    )}
                    {niptLookupStatus.capabilities.capOm && (
                      <li>✓ OM / certifikim - licenca {niptLookupStatus.licenses.omLicenseNumber}</li>
                    )}
                  </ul>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={wantMaintenance}
                      onChange={(e) => setWantMaintenance(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Dëshironi të regjistroheni edhe si mirëmbajtje?</span>
                    </span>
                  </label>
                </div>
              )}

              {isMaintenanceOnlyRegistration && (
                <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-[11px] text-sky-950">
                  Do të regjistroheni si <span className="font-medium">kompani mirëmbajtjeje</span> - jeni
                  jashtë regjistrit të Drejtorisë së Politikave. Kur merrni licencë instalimi ose OM,
                  Drejtoría ju shton licencën dhe funksionet e reja aktivizohen në llogarinë tuaj.
                </div>
              )}

              {installLicenseNumber && (
                <input type="hidden" name="installLicenseNumber" value={installLicenseNumber} />
              )}
              {omLicenseNumber && <input type="hidden" name="omLicenseNumber" value={omLicenseNumber} />}

              <FormSection title={PROFILE_SECTION_TITLES.business}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="organizationName" className={labelClass}>Emri i organizatës *</Label>
                    <Input
                      id="organizationName"
                      name="organizationName"
                      required
                      className={inputClass}
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection title={PROFILE_SECTION_TITLES.contact}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className={labelClass}>Emri *</Label>
                    <Input id="firstName" name="firstName" required className={inputClass} defaultValue={demoDefault("firstName")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className={labelClass}>Mbiemri *</Label>
                    <Input id="lastName" name="lastName" required className={inputClass} defaultValue={demoDefault("lastName")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className={labelClass}>Email *</Label>
                    <Input id="email" name="email" type="email" required className={inputClass} defaultValue={demoDefault("email")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className={labelClass}>Numri i Telefonit *</Label>
                    <Input id="phone" name="phone" required className={inputClass} defaultValue={demoDefault("phone")} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="personalNumber" className={labelClass}>
                      Numri Personal (opsional)
                    </Label>
                    <Input id="personalNumber" name="personalNumber" className={inputClass} defaultValue={demoDefault("personalNumber")} />
                  </div>
                </div>
              </FormSection>
            </>
          ) : level === "OWNER" ? (
            <>
              <FormSection title={PROFILE_SECTION_TITLES.ownerSubject}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="ownerBuildingRole" className={labelClass}>
                      Lloji i subjektit *
                    </Label>
                    <select
                      id="ownerBuildingRole"
                      name="ownerBuildingRole"
                      value={ownerEntityType}
                      onChange={(e) =>
                        handleOwnerEntityTypeChange(e.target.value as RegisterOwnerEntityType)
                      }
                      required
                      className="flex h-9 w-full rounded-md border px-3 text-sm"
                    >
                      {REGISTER_OWNER_ENTITY_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {registerOwnerEntityTypeLabel(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {ownerNeedsSubjectName && (
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="organizationName" className={labelClass}>Emri i subjektit *</Label>
                      <Input
                        id="organizationName"
                        name="organizationName"
                        required
                        className={inputClass}
                        defaultValue={demoDefault("organizationName")}
                      />
                    </div>
                  )}
                  {ownerNeedsNipt && (
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="nipt" className={labelClass}>NIPT *</Label>
                      <Input id="nipt" name="nipt" required className={inputClass} defaultValue={demoDefault("nipt")} />
                    </div>
                  )}
                </div>
              </FormSection>

              <FormSection title={PROFILE_SECTION_TITLES.ownerContact}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className={labelClass}>Emri *</Label>
                    <Input id="firstName" name="firstName" required className={inputClass} defaultValue={demoDefault("firstName")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fatherName" className={labelClass}>Atësia *</Label>
                    <Input id="fatherName" name="fatherName" required className={inputClass} defaultValue={demoDefault("fatherName")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className={labelClass}>Mbiemri *</Label>
                    <Input id="lastName" name="lastName" required className={inputClass} defaultValue={demoDefault("lastName")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="personalNumber" className={labelClass}>Numri Personal *</Label>
                    <Input
                      id="personalNumber"
                      name="personalNumber"
                      required
                      className={inputClass}
                      defaultValue={demoDefault("personalNumber")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="birthDate" className={labelClass}>Data e Lindjes *</Label>
                    <Input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      required
                      className={inputClass}
                      defaultValue={demoDefault("birthDate")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className={labelClass}>Email *</Label>
                    <Input id="email" name="email" type="email" required className={inputClass} defaultValue={demoDefault("email")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className={labelClass}>Numri i Telefonit *</Label>
                    <Input id="phone" name="phone" required className={inputClass} defaultValue={demoDefault("phone")} />
                  </div>
                </div>
              </FormSection>
            </>
          ) : null}

          <FormSection title="Fjalëkalimi">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="password" className={labelClass}>Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={inputClass}
                  defaultValue={demoDefault("password")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className={labelClass}>Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className={inputClass}
                  defaultValue={demoDefault("confirmPassword")}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Të paktën 8 karaktere, një numër, një gërmë kapitale dhe një jo-kapitale.
            </p>
          </FormSection>

          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              name="acceptTerms"
              value="true"
              required
              className="mt-0.5"
              defaultChecked={demoFill !== null}
            />
            <TermsAcceptanceLabel />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            <Link href="/auth/login" className="text-xs text-primary hover:underline">
              Kthehu Prapa
            </Link>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Duke u regjistruar..." : "Regjistrohu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
