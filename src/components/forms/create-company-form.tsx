"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import {
  checkDirectorateCreateCompanyNiptAction,
  createLicensedCompanyAction,
  fetchDirectorateCompanyDemoPrefillAction,
} from "@/lib/actions/organization-actions";
import {
  CompanyCapabilitySelector,
  type CompanyCapabilityName,
} from "@/components/forms/company-capability-selector";
import {
  directorateCompanyDemoModeLabel,
  type DirectorateCompanyDemoMode,
} from "@/lib/demo/directorate-company-demo-prefill";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStep, SectionCard } from "@/components/shared/institutional";

type Municipality = { id: string; nameSq: string; region: { nameSq: string } };

const DEMO_MODES: DirectorateCompanyDemoMode[] = ["install", "om", "installOm"];

const EMPTY_VALUES = {
  name: "",
  nipt: "",
  municipalityId: "",
  email: "",
  phone: "",
  address: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
};

export function CreateCompanyForm({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedCaps, setSelectedCaps] = useState<CompanyCapabilityName[]>(["capInstall"]);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [demoMode, setDemoMode] = useState<DirectorateCompanyDemoMode>("install");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [niptChecking, setNiptChecking] = useState(false);
  const [niptStatus, setNiptStatus] = useState<
    | { status: "AVAILABLE" }
    | { status: "PORTAL_MAINTENANCE"; organizationId: string; orgName: string }
    | { status: "ALREADY_REGISTERED"; organizationId: string; orgName: string }
    | null
  >(null);
  const showDemoTools = isDemoToolsEnabled();

  function setField(name: keyof typeof EMPTY_VALUES, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (name === "nipt") {
      setNiptStatus(null);
      setError(null);
    }
  }

  async function checkNipt() {
    const nipt = values.nipt.trim();
    if (nipt.length < 8) {
      setNiptStatus(null);
      return;
    }

    setNiptChecking(true);
    const result = await checkDirectorateCreateCompanyNiptAction(nipt);
    setNiptChecking(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.data.status === "TOO_SHORT") {
      setNiptStatus(null);
      return;
    }

    if (result.data.status === "AVAILABLE") {
      setNiptStatus({ status: "AVAILABLE" });
      return;
    }

    setNiptStatus(result.data);
  }

  const portalMaintenance =
    niptStatus?.status === "PORTAL_MAINTENANCE" ? niptStatus : null;
  const alreadyRegistered =
    niptStatus?.status === "ALREADY_REGISTERED" ? niptStatus : null;
  const canCreate = !portalMaintenance && !alreadyRegistered;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate) return;
    if (selectedCaps.length === 0) {
      setError("Zgjidhni të paktën një funksion për kompaninë.");
      return;
    }

    const fd = new FormData();
    fd.set("capInstall", selectedCaps.includes("capInstall") ? "true" : "false");
    fd.set("capMaintenance", selectedCaps.includes("capMaintenance") ? "true" : "false");
    fd.set("capOm", selectedCaps.includes("capOm") ? "true" : "false");
    fd.set("name", values.name);
    fd.set("nipt", values.nipt);
    fd.set("municipalityId", values.municipalityId);
    fd.set("email", values.email);
    fd.set("phone", values.phone);
    fd.set("address", values.address);
    fd.set("adminFirstName", values.adminFirstName);
    fd.set("adminLastName", values.adminLastName);
    fd.set("adminEmail", values.adminEmail);

    const result = await createLicensedCompanyAction(fd);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/directorate/companies/${result.data.organizationId}/licenses`);
    router.refresh();
  }

  async function fillDemoData() {
    setDemoLoading(true);
    setError(null);
    setDemoHint(null);
    const result = await fetchDirectorateCompanyDemoPrefillAction(demoMode);
    setDemoLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    setSelectedCaps(result.data.selectedCaps);
    setValues({
      ...result.data.values,
      municipalityId: municipalities[0]?.id ?? "",
    });
    setNiptStatus(null);
    setDemoHint(
      `U plotësua si ${directorateCompanyDemoModeLabel(result.data.mode).toLowerCase()} demo. NIPT: ${result.data.values.nipt} · Pas krijimit, kompania regjistrohet në portal me këtë NIPT.`,
    );
  }

  return (
    <SectionCard title="Formulari i regjistrimit" subtitle="Plotësoni të dhënat dhe zgjidhni funksionet" padded>
      {showDemoTools && (
          <div className="mb-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-xs font-medium text-amber-950">Demo - plotësim i shpejtë</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_MODES.map((mode) => {
                const active = demoMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={demoLoading}
                    onClick={() => {
                      setDemoMode(mode);
                      setDemoHint(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-amber-600 bg-amber-100 font-medium text-amber-950"
                        : "border-amber-200 bg-white text-amber-900 hover:border-amber-400"
                    }`}
                  >
                    {directorateCompanyDemoModeLabel(mode)}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void fillDemoData()}
              disabled={demoLoading}
              className="workflow-demo-btn"
            >
              <FlaskConical className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              {demoLoading ? "Duke plotësuar…" : "Plotëso me të dhëna demo"}
            </button>
            {demoHint && <p className="text-[11px] text-amber-900">{demoHint}</p>}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-6">
          <FormStep step={1} title="Funksionet e kompanisë" description="Zgjidhni instalim, OM, ose të dyja.">
            <CompanyCapabilitySelector
              selected={selectedCaps}
              onChange={setSelectedCaps}
              excludeCapabilities={["capMaintenance"]}
              legend=""
              hint=""
            />
          </FormStep>

          <FormStep step={2} title="Të dhënat e kompanisë" description="Informacioni që shfaqet në regjistër dhe portal.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Emri</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={values.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nipt">NIPT</Label>
                <Input
                  id="nipt"
                  name="nipt"
                  value={values.nipt}
                  onChange={(e) => setField("nipt", e.target.value)}
                  onBlur={() => void checkNipt()}
                />
                {niptChecking && (
                  <p className="text-xs text-muted-foreground">Duke kontrolluar NIPT-in…</p>
                )}
                {portalMaintenance && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
                    <p className="font-medium">{portalMaintenance.orgName} ndodhet në portal.</p>
                    <p className="mt-1 text-xs text-sky-900/90">
                      Kjo është kompani mirëmbajtjeje - shtoni licenca instalimi ose OM; funksionet aktivizohen
                      në llogarinë ekzistuese.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href={`/directorate/companies/${portalMaintenance.organizationId}/licenses`}>
                        Shko te licencat
                      </Link>
                    </Button>
                  </div>
                )}
                {alreadyRegistered && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
                    <p className="font-medium">{alreadyRegistered.orgName} është tashmë në regjistrin e Drejtorisë.</p>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link href={`/directorate/companies/${alreadyRegistered.organizationId}`}>
                        Shiko kompaninë
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipalityId">Bashkia</Label>
                <select
                  id="municipalityId"
                  name="municipalityId"
                  className="flex h-10 w-full rounded-md border px-3 text-sm"
                  value={values.municipalityId}
                  onChange={(e) => setField("municipalityId", e.target.value)}
                >
                  <option value="">-</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>{m.nameSq}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email kompanie</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={values.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Adresa</Label>
                <Input
                  id="address"
                  name="address"
                  value={values.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
            </div>
          </FormStep>

          <FormStep step={3} title="Administratori (opsional)" description="Ftoni personin e parë që do të menaxhojë llogarinë në portal." last>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">Emri</Label>
                <Input
                  id="adminFirstName"
                  name="adminFirstName"
                  value={values.adminFirstName}
                  onChange={(e) => setField("adminFirstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Mbiemri</Label>
                <Input
                  id="adminLastName"
                  name="adminLastName"
                  value={values.adminLastName}
                  onChange={(e) => setField("adminLastName", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adminEmail">Email administratori</Label>
                <Input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  value={values.adminEmail}
                  onChange={(e) => setField("adminEmail", e.target.value)}
                />
              </div>
            </div>
          </FormStep>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {canCreate && (
            <Button type="submit" className="w-full sm:w-auto">
              Krijo kompaninë dhe gjenero licencat
            </Button>
          )}
        </form>
    </SectionCard>
  );
}
