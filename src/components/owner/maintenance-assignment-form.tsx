"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useRef, useState } from "react";
import { requestMaintenanceAssignmentAction } from "@/lib/actions/owner-actions";
import { MaintenanceAssignmentDemoButton } from "@/components/demo/maintenance-assignment-demo-button";
import { PERIODIC_INSPECTION_CONTRACT_LABEL, PERIODIC_INSPECTION_LABEL } from "@/lib/constants/periodic-inspection-labels";
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

const NIPT_REGEX = /^[A-Za-z][0-9]{8}[A-Za-z]$/;

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

function SeparateContractFields({
  prefix,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  prefix: "maintenance" | "inspection";
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
}) {
  const controlled = prefix === "maintenance" && onStartDateChange != null && onEndDateChange != null;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label>Data fillimit *</Label>
        {controlled ? (
          <Input
            name={`${prefix}StartDate`}
            type="date"
            required
            value={startDate ?? ""}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        ) : (
          <Input name={`${prefix}StartDate`} type="date" required />
        )}
      </div>
      <div className="space-y-1">
        <Label>Data mbarimit *</Label>
        {controlled ? (
          <Input
            name={`${prefix}EndDate`}
            type="date"
            required
            value={endDate ?? ""}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        ) : (
          <Input name={`${prefix}EndDate`} type="date" required />
        )}
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

type ActiveMaintenanceContract = {
  contractNumber: string | null;
  companyName: string;
  companyNipt: string | null;
};

export function MaintenanceAssignmentForm({
  elevatorId,
  companies: _companies,
  certifiers,
  scope,
  submitLabel,
  changeFromActiveContract,
}: {
  elevatorId: string;
  companies: MaintenanceCompanyOption[];
  certifiers: CertifierOption[];
  /** Kur jepet, forma shfaq vetëm shërbimet që mungojnë (p.sh. në skedën Inspektimet). */
  scope?: AssignmentScope;
  submitLabel?: string;
  /** Kur ka kontratë ACTIVE - kërkohet arsye ndërprerjeje para ftesës së re. */
  changeFromActiveContract?: ActiveMaintenanceContract;
}) {
  const bothServicesInScope = scope ? scope.needsMaintenance && scope.needsInspection : true;
  const maintenanceOnlyInScope = scope ? scope.needsMaintenance && !scope.needsInspection : false;
  const inspectionOnlyInScope = scope ? !scope.needsMaintenance && scope.needsInspection : false;
  const showModeSelector = !scope || bothServicesInScope;

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [changeFormOpen, setChangeFormOpen] = useState(!changeFromActiveContract);
  const [terminationReason, setTerminationReason] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(
    maintenanceOnlyInScope || inspectionOnlyInScope ? "different" : "same",
  );
  const [enableMaintenance, setEnableMaintenance] = useState(scope?.needsMaintenance ?? true);
  const [enableInspection, setEnableInspection] = useState(scope?.needsInspection ?? true);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MaintenanceCompanyOption[]>([]);
  const [maintenanceId, setMaintenanceId] = useState("");
  const [inspectionId, setInspectionId] = useState("");
  const [maintenanceStartDate, setMaintenanceStartDate] = useState("");
  const [maintenanceEndDate, setMaintenanceEndDate] = useState("");
  const requestIdRef = useRef(0);

  const maintenanceActive = assignmentMode === "same" ? true : enableMaintenance;
  const inspectionActive = assignmentMode === "same" ? true : enableInspection;

  const selectedMaintenance = searchResults.find((company) => company.id === maintenanceId) ?? null;
  const sameCompanyOptions = certifiers.filter((certifier) => certifier.selectable);

  const selectedSameCompany =
    assignmentMode === "same"
      ? sameCompanyOptions.find((company) => company.id === inspectionId) ?? null
      : null;

  function chooseAssignmentMode(mode: AssignmentMode) {
    if (!showModeSelector) return;
    setAssignmentMode(mode);
    setError(null);
    setStatusMessage(null);
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

  function selectMaintenanceCompany(company: MaintenanceCompanyOption) {
    if (!company.selectable) return;
    setMaintenanceId(company.id);
    setStatusMessage(`${company.name} - ${company.qkbStatusLabel}`);
    setError(null);
  }

  useEffect(() => {
    function handleDemoPrefill(event: Event) {
      const detail = (
        event as CustomEvent<{ query?: string; startDate?: string; endDate?: string }>
      ).detail;
      if (!detail) return;
      setError(null);
      if (detail.query?.trim()) setQuery(detail.query.trim());
      if (detail.startDate) setMaintenanceStartDate(detail.startDate);
      if (detail.endDate) setMaintenanceEndDate(detail.endDate);
    }

    window.addEventListener("ishmt:maintenance-demo-prefill", handleDemoPrefill);
    return () => window.removeEventListener("ishmt:maintenance-demo-prefill", handleDemoPrefill);
  }, []);

  useEffect(() => {
    if (assignmentMode !== "different" || !maintenanceActive) {
      setSearchResults([]);
      setMaintenanceId("");
      setStatusMessage(null);
      setLoading(false);
      return;
    }

    const normalized = query.trim();
    if (normalized.length < 2) {
      setSearchResults([]);
      setMaintenanceId("");
      setStatusMessage(null);
      setLoading(false);
      return;
    }

    const isNipt = NIPT_REGEX.test(normalized.toUpperCase());
    const delay = isNipt ? 0 : 280;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/qkb/lookup?scope=maintenance&query=${encodeURIComponent(normalized)}`,
          { signal: controller.signal },
        );
        const data = await res.json();

        if (requestId !== requestIdRef.current) return;

        if (!res.ok) {
          setSearchResults([]);
          setMaintenanceId("");
          setStatusMessage(null);
          setError(data.error || "Kontrolli QKB dështoi.");
          return;
        }

        const companiesFound: MaintenanceCompanyOption[] = [...(data.companies ?? [])];
        if (data.company && !companiesFound.some((company) => company.id === data.company.id)) {
          companiesFound.unshift(data.company);
        }
        setSearchResults(companiesFound);

        if (data.company?.selectable) {
          setMaintenanceId(data.company.id);
          setStatusMessage(`${data.company.name} - ${data.company.qkbStatusLabel}`);
          return;
        }

        const firstSelectable = companiesFound.find((company) => company.selectable);
        if (isNipt && firstSelectable) {
          setMaintenanceId(firstSelectable.id);
          setStatusMessage(`${firstSelectable.name} - ${firstSelectable.qkbStatusLabel}`);
          return;
        }

        setMaintenanceId("");

        if (companiesFound.length === 0) {
          setStatusMessage("Nuk u gjet kompani mirëmbajtjeje me këtë emër ose NIPT.");
          return;
        }

        if (companiesFound.length === 1) {
          const company = companiesFound[0];
          setStatusMessage(
            company.selectable
              ? `${company.name} - ${company.qkbStatusLabel}`
              : `${company.name} - ${company.qkbStatusLabel}. Nuk mund të caktohet.`,
          );
          if (company.selectable) setMaintenanceId(company.id);
          return;
        }

        setStatusMessage(`Gjetur ${companiesFound.length} kompani. Zgjidhni një nga lista.`);
      } catch (lookupError) {
        if (lookupError instanceof DOMException && lookupError.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setSearchResults([]);
        setMaintenanceId("");
        setStatusMessage(null);
        setError("Kontrolli QKB dështoi. Provoni përsëri.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, assignmentMode, maintenanceActive]);

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
      setError(`Zgjidhni të paktën një shërbim (mirëmbajtje ose ${PERIODIC_INSPECTION_LABEL.toLowerCase()}).`);
      return;
    }

    if (assignmentMode === "same") {
      if (!selectedSameCompany) {
        setError("Zgjidhni kompaninë OM që do të kryejë shërbimet.");
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
          setError(`Zgjidhni kompaninë OM për ${PERIODIC_INSPECTION_LABEL.toLowerCase()}.`);
          return;
        }
        fd.set("inspectionOrgId", inspectionId);
      }
    }

    if (changeFromActiveContract && terminationReason.trim().length < 10) {
      setError("Shkruani arsyen e ndërprerjes së kontratës aktive (të paktën 10 karaktere).");
      return;
    }

    setSubmitting(true);
    try {
      if (changeFromActiveContract) {
        fd.set("maintenanceTerminationReason", terminationReason.trim());
      }
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

  if (changeFromActiveContract && !changeFormOpen) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
          <p className="font-medium text-foreground">Kontrata aktive e mirëmbajtjes</p>
          <p className="mt-1 text-muted-foreground">
            <span className="font-mono">{changeFromActiveContract.contractNumber ?? "-"}</span>
            {" · "}
            {changeFromActiveContract.companyName}
            {changeFromActiveContract.companyNipt
              ? ` (${changeFromActiveContract.companyNipt})`
              : ""}
          </p>
        </div>
        <Button
          type="button"
          className="bg-gov-primary hover:bg-gov-secondary"
          onClick={() => setChangeFormOpen(true)}
        >
          Ndrysho kompaninë e mirëmbajtjes
        </Button>
        <p className="text-xs text-muted-foreground">
          Për të caktuar kompani tjetër, kontrata aktive ndërpritet me arsye të detyrueshme. Kompania e re
          duhet ta pranojë ftesën.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      {changeFromActiveContract && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
          <p className="text-sm font-semibold">Ndërprerja e kontratës aktive</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kontrata{" "}
            <span className="font-mono font-medium text-foreground">
              {changeFromActiveContract.contractNumber ?? "-"}
            </span>{" "}
            me {changeFromActiveContract.companyName} do të shënohet si e përfunduar.
          </p>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="maintenanceTerminationReason">Arsyeja e ndërprerjes *</Label>
            <textarea
              id="maintenanceTerminationReason"
              name="maintenanceTerminationReason"
              value={terminationReason}
              onChange={(event) => setTerminationReason(event.target.value)}
              className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="P.sh. shërbim i dobët, ndryshim çmimi, mungesë respekti të afateve…"
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Arsyeja ruhet në regjistër, njoftohet kompania aktuale dhe shfaqet në historikun e kontratës.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setChangeFormOpen(false);
              setTerminationReason("");
              setError(null);
            }}
          >
            Anulo ndryshimin
          </Button>
        </div>
      )}

      {maintenanceOnlyInScope && <MaintenanceAssignmentDemoButton className="mb-1" />}

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
                {PERIODIC_INSPECTION_LABEL}
              </label>
            </div>
          </div>
        )}
      </div>
      )}

      {assignmentMode === "same" && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Kompania OM dhe kontrata e shërbimeve</p>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Kompania OM *</Label>
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

          {!maintenanceOnlyInScope && <MaintenanceAssignmentDemoButton className="mt-2" />}

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="maintenanceCompanyQuery">Emri i kompanisë ose NIPT</Label>
            <Input
              id="maintenanceCompanyQuery"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Emri i kompanisë ose NIPT"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && (
              <p className="text-xs text-muted-foreground">Duke kontrolluar në QKB…</p>
            )}
            {!loading && statusMessage && (
              <p
                className={`text-xs ${
                  selectedMaintenance?.selectable ? "text-green-700" : "text-muted-foreground"
                }`}
              >
                {statusMessage}
              </p>
            )}
          </div>

          {searchResults.length > 1 && (
            <ul className="mt-4 space-y-2">
              {searchResults.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => selectMaintenanceCompany(company)}
                    disabled={!company.selectable}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      maintenanceId === company.id
                        ? "border-gov-primary bg-gov-primary/5"
                        : "border-border bg-background hover:border-gov-primary/40"
                    } ${!company.selectable ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.nipt ? `${company.nipt} · ` : ""}
                      {company.qkbStatusLabel}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <SeparateContractFields
            prefix="maintenance"
            startDate={maintenanceStartDate}
            endDate={maintenanceEndDate}
            onStartDateChange={setMaintenanceStartDate}
            onEndDateChange={setMaintenanceEndDate}
          />
        </div>
      )}

      {assignmentMode === "different" && inspectionActive && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold">{PERIODIC_INSPECTION_CONTRACT_LABEL}</p>
          </div>

          <div className="mt-4 space-y-2">
            <Label>OM / certifikuesi *</Label>
            <select
              value={inspectionId}
              onChange={(event) => setInspectionId(event.target.value)}
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              required
            >
              <option value="">Zgjidhni OM/certifikuesin</option>
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
      <Button type="submit" disabled={!canSubmit || submitting} className="bg-gov-primary hover:bg-gov-secondary">
        {submitting
          ? "Duke dërguar…"
          : (submitLabel ??
            (changeFromActiveContract
              ? "Ndërprit kontratën dhe dërgo ftesën e re"
              : "Cakto dhe dërgo ftesat"))}
      </Button>
    </form>
  );
}
