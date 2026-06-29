"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestMaintenanceAssignmentAction } from "@/lib/actions/owner-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QkbStatus } from "@/lib/services/qkb-lookup-service";

type MaintenanceCompanyOption = {
  id: string;
  name: string;
  nipt: string | null;
  qkbStatus: QkbStatus;
  qkbStatusLabel: string;
  selectable: boolean;
};

type CertifierOption = {
  id: string;
  name: string;
  nipt: string | null;
  selectable: boolean;
};

type AssignmentMode = "same" | "different";

type QkbResult = {
  selectable: boolean;
  label: string;
  companyId?: string;
};

function CombinedContractFields() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label>Data fillimit *</Label>
        <Input name="combinedStartDate" type="date" required />
      </div>
      <div className="space-y-1">
        <Label>Data mbarimit *</Label>
        <Input name="combinedEndDate" type="date" required />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label>Numri i kontratës</Label>
        <Input name="combinedContractNumber" placeholder="Gjenerohet automatikisht nëse bosh" />
        <p className="text-xs text-muted-foreground">
          Dokumenti i kontratës ngarkohet nga kompania pas pranimit të ftesës.
        </p>
      </div>
    </div>
  );
}

function SeparateContractFields({ prefix }: { prefix: "maintenance" | "inspection" }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label>Data fillimit *</Label>
        <Input name={`${prefix}StartDate`} type="date" required />
      </div>
      <div className="space-y-1">
        <Label>Data mbarimit *</Label>
        <Input name={`${prefix}EndDate`} type="date" required />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label>Numri i kontratës</Label>
        <Input name={`${prefix}ContractNumber`} placeholder="Gjenerohet automatikisht nëse bosh" />
        <p className="text-xs text-muted-foreground">
          Dokumenti i kontratës ngarkohet nga kompania pas pranimit të ftesës.
        </p>
      </div>
    </div>
  );
}

type AssignmentScope = {
  needsMaintenance: boolean;
  needsInspection: boolean;
};

export function MaintenanceAssignmentForm({
  elevatorId,
  companies,
  certifiers,
  scope,
}: {
  elevatorId: string;
  companies: MaintenanceCompanyOption[];
  certifiers: CertifierOption[];
  /** Kur jepet, forma shfaq vetëm shërbimet që mungojnë (p.sh. në skedën Inspektimet). */
  scope?: AssignmentScope;
}) {
  const bothServicesInScope = scope ? scope.needsMaintenance && scope.needsInspection : true;
  const maintenanceOnlyInScope = scope ? scope.needsMaintenance && !scope.needsInspection : false;
  const inspectionOnlyInScope = scope ? !scope.needsMaintenance && scope.needsInspection : false;
  const showModeSelector = !scope || bothServicesInScope;

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(
    maintenanceOnlyInScope || inspectionOnlyInScope ? "different" : "same",
  );
  const [enableMaintenance, setEnableMaintenance] = useState(scope?.needsMaintenance ?? true);
  const [enableInspection, setEnableInspection] = useState(scope?.needsInspection ?? true);
  const [query, setQuery] = useState("");
  const [qkbResult, setQkbResult] = useState<QkbResult | null>(null);
  const [searchResults, setSearchResults] = useState<MaintenanceCompanyOption[]>([]);
  const [maintenanceId, setMaintenanceId] = useState("");
  const [inspectionId, setInspectionId] = useState("");

  const maintenanceActive = assignmentMode === "same" ? true : enableMaintenance;
  const inspectionActive = assignmentMode === "same" ? true : enableInspection;

  const availableCompanies = searchResults;
  const selectedMaintenance = availableCompanies.find((company) => company.id === maintenanceId) ?? null;
  const sameCompanyOptions = certifiers.filter((certifier) => certifier.selectable);

  const selectedSameCompany =
    assignmentMode === "same"
      ? sameCompanyOptions.find((company) => company.id === inspectionId) ?? null
      : null;

  function chooseAssignmentMode(mode: AssignmentMode) {
    if (!showModeSelector) return;
    setAssignmentMode(mode);
    setError(null);
    setQkbResult(null);
    setSearchResults([]);
    setMaintenanceId("");
    setInspectionId("");
    setQuery("");
    if (scope) {
      setEnableMaintenance(scope.needsMaintenance);
      setEnableInspection(scope.needsInspection);
    } else {
      setEnableMaintenance(true);
      setEnableInspection(true);
    }
  }

  async function lookupCompany() {
    setError(null);
    setQkbResult(null);
    setSearchResults([]);

    if (!query.trim()) {
      setError("Shkruani emrin ose NIPT-in e kompanisë.");
      return;
    }

    const res = await fetch(`/api/qkb/lookup?query=${encodeURIComponent(query.trim())}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kontrolli QKB dështoi.");
      return;
    }

    const companiesFound: MaintenanceCompanyOption[] = data.companies ?? (data.company ? [data.company] : []);
    setSearchResults(companiesFound);
    if (data.company?.id) {
      setMaintenanceId(data.company.id);
    }

    if (data.company) {
      setQkbResult({
        selectable: data.selectable,
        label: `${data.company.name} - ${data.company.qkbStatusLabel}`,
        companyId: data.company.id,
      });
      return;
    }

    if (companiesFound.length > 0) {
      setQkbResult({
        selectable: companiesFound.some((company) => company.selectable),
        label: `Gjetur ${companiesFound.length} kompani të ngjashme. Zgjidhni një nga lista.`,
      });
      return;
    }

    setQkbResult({
      selectable: false,
      label: "Nuk u gjetën kompani të përshtatshme. Kontrolloni emrin ose NIPT-in dhe provoni përsëri.",
    });
  }

  const canSubmit = (() => {
    if (!maintenanceActive && !inspectionActive) return false;
    if (assignmentMode === "same") return Boolean(selectedSameCompany);
    if (maintenanceActive && !selectedMaintenance?.selectable) return false;
    if (inspectionActive && !inspectionId) return false;
    return true;
  })();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("assignmentMode", assignmentMode);
    fd.set("maintenanceEnabled", maintenanceActive ? "true" : "false");
    fd.set("inspectionEnabled", inspectionActive ? "true" : "false");

    if (!maintenanceActive && !inspectionActive) {
      setError("Zgjidhni të paktën një shërbim (mirëmbajtje ose inspektim).");
      return;
    }

    if (assignmentMode === "same") {
      if (!selectedSameCompany) {
        setError("Zgjidhni kompaninë OMI që do të kryejë shërbimet.");
        return;
      }
      fd.set("maintenanceOrgId", selectedSameCompany.id);
      fd.set("inspectionOrgId", selectedSameCompany.id);
    } else {
      if (maintenanceActive) {
        if (!selectedMaintenance?.selectable) {
          setError("Kompania e mirëmbajtjes duhet të jetë ACTIVE në QKB.");
          return;
        }
        fd.set("maintenanceOrgId", selectedMaintenance.id);
      }
      if (inspectionActive) {
        if (!inspectionId) {
          setError("Zgjidhni kompaninë OMI për inspektimin periodik.");
          return;
        }
        fd.set("inspectionOrgId", inspectionId);
      }
    }

    setSubmitting(true);
    try {
      const result = await requestMaintenanceAssignmentAction(elevatorId, fd);
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      {showModeSelector && (
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-lg font-semibold">Zgjidh modelin e kontraktimit</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-2xl border p-4 text-sm ${
              assignmentMode === "same" ? "border-gov-primary bg-gov-primary/5" : "border-border bg-background"
            }`}
          >
            <input
              type="radio"
              name="assignmentModeRadio"
              value="same"
              checked={assignmentMode === "same"}
              onChange={() => chooseAssignmentMode("same")}
              className="mr-2"
            />
            E njëjta kompani për të dyja
          </label>
          <label
            className={`cursor-pointer rounded-2xl border p-4 text-sm ${
              assignmentMode === "different" ? "border-gov-primary bg-gov-primary/5" : "border-border bg-background"
            }`}
          >
            <input
              type="radio"
              name="assignmentModeRadio"
              value="different"
              checked={assignmentMode === "different"}
              onChange={() => chooseAssignmentMode("different")}
              className="mr-2"
            />
            Kompani të ndryshme
          </label>
        </div>

        {assignmentMode === "different" && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="text-sm font-semibold">Zgjidh shërbimet</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enableMaintenance}
                  onChange={(event) => setEnableMaintenance(event.target.checked)}
                />
                Mirëmbajtje
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enableInspection}
                  onChange={(event) => setEnableInspection(event.target.checked)}
                />
                Inspektim periodik
              </label>
            </div>
          </div>
        )}
      </div>
      )}

      {assignmentMode === "same" && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Kompania OMI dhe kontrata e shërbimeve</p>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Kompania OMI *</Label>
            <select
              value={inspectionId}
              onChange={(event) => setInspectionId(event.target.value)}
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              required
            >
              <option value="">Zgjidhni kompaninë</option>
              {sameCompanyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.nipt ? ` (${company.nipt})` : ""}
                </option>
              ))}
            </select>
          </div>
          <CombinedContractFields />
        </div>
      )}

      {assignmentMode === "different" && maintenanceActive && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Kontrata e mirëmbajtjes</p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Emri i kompanisë ose NIPT"
            />
            <Button type="button" variant="outline" onClick={lookupCompany}>
              Kontrollo QKB
            </Button>
            {qkbResult && (
              <p className={`text-xs ${qkbResult.selectable ? "text-green-700" : "text-red-700"}`}>
                {qkbResult.label}
              </p>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {availableCompanies.map((company) => (
              <div
                key={company.id}
                className={`rounded-2xl border p-4 text-sm ${
                  maintenanceId === company.id
                    ? "border-gov-primary bg-gov-primary/5"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.nipt ? company.nipt : "NIPT i panjohur"} - {company.qkbStatusLabel}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={maintenanceId === company.id ? "secondary" : "outline"}
                    onClick={() => setMaintenanceId(company.id)}
                    disabled={!company.selectable}
                  >
                    {maintenanceId === company.id ? "I zgjedhur" : "Zgjidh"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <SeparateContractFields prefix="maintenance" />
        </div>
      )}

      {assignmentMode === "different" && inspectionActive && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Kontrata e inspektimit periodik</p>
          </div>

          <div className="mt-4 space-y-2">
            <Label>OMI / certifikuesi *</Label>
            <select
              value={inspectionId}
              onChange={(event) => setInspectionId(event.target.value)}
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              required
            >
              <option value="">Zgjidhni OMI/certifikuesin</option>
              {certifiers
                .filter((certifier) => certifier.selectable)
                .map((certifier) => (
                  <option key={certifier.id} value={certifier.id}>
                    {certifier.name}
                    {certifier.nipt ? ` (${certifier.nipt})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <SeparateContractFields prefix="inspection" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!canSubmit || submitting}>
        {submitting ? "Duke dërguar…" : "Cakto dhe dërgo ftesat"}
      </Button>
    </form>
  );
}
