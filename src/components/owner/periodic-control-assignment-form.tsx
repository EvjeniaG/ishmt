"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/lib/navigation/use-app-router";
import { requestMaintenanceAssignmentAction } from "@/lib/actions/owner-actions";
import { InspectionAssignmentDemoButton } from "@/components/demo/inspection-assignment-demo-button";
import { PeriodicControlSchedulePanel } from "@/components/owner/periodic-control-schedule-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PeriodicControlSchedule } from "@/lib/elevators/periodic-control-schedule";
import { PERIODIC_INSPECTION_CONTRACT_LABEL, PERIODIC_INSPECTION_LABEL } from "@/lib/constants/periodic-inspection-labels";
import { defaultInspectionContractEndDate } from "@/lib/elevators/periodic-control-schedule";

type CertifierOption = {
  id: string;
  name: string;
  nipt: string | null;
  selectable: boolean;
};

type ActiveInspectionContract = {
  contractNumber: string | null;
  companyName: string;
  companyNipt: string | null;
};

export function PeriodicControlAssignmentForm({
  elevatorId,
  certifiers,
  schedule,
  changeFromActiveContract,
}: {
  elevatorId: string;
  certifiers: CertifierOption[];
  schedule: PeriodicControlSchedule;
  /** Kur ka kontratë ACTIVE - kërkohet arsye ndërprerjeje para ftesës së re. */
  changeFromActiveContract?: ActiveInspectionContract;
}) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultEnd = useMemo(
    () => defaultInspectionContractEndDate(new Date(), schedule.intervalMonths),
    [schedule.intervalMonths],
  );

  const eligibleCertifiers = useMemo(
    () => certifiers.filter((certifier) => certifier.selectable),
    [certifiers],
  );

  const [changeFormOpen, setChangeFormOpen] = useState(!changeFromActiveContract);
  const [terminationReason, setTerminationReason] = useState("");
  const [inspectionOrgId, setInspectionOrgId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCertifier = eligibleCertifiers.find((certifier) => certifier.id === inspectionOrgId) ?? null;

  useEffect(() => {
    function handleDemoPrefill(event: Event) {
      const detail = (
        event as CustomEvent<{ orgId?: string; startDate?: string; endDate?: string }>
      ).detail;
      if (!detail) return;
      setError(null);
      if (detail.orgId) setInspectionOrgId(detail.orgId);
      if (detail.startDate) setStartDate(detail.startDate);
      if (detail.endDate) setEndDate(detail.endDate);
    }

    window.addEventListener("ishmt:inspection-demo-prefill", handleDemoPrefill);
    return () => window.removeEventListener("ishmt:inspection-demo-prefill", handleDemoPrefill);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedCertifier) {
      setError("Zgjidhni një organizatë OM nga lista.");
      return;
    }

    if (changeFromActiveContract && terminationReason.trim().length < 10) {
      setError("Shkruani arsyen e ndërprerjes së kontratës aktive (të paktën 10 karaktere).");
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("assignmentMode", "different");
    fd.set("maintenanceEnabled", "false");
    fd.set("inspectionEnabled", "true");
    fd.set("inspectionOrgId", inspectionOrgId);
    if (changeFromActiveContract) {
      fd.set("inspectionTerminationReason", terminationReason.trim());
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

  if (changeFromActiveContract && !changeFormOpen) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
          <p className="font-medium text-foreground">Kontrata aktive e {PERIODIC_INSPECTION_LABEL.toLowerCase()}</p>
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
          Ndrysho organizatën OM
        </Button>
        <p className="text-xs text-muted-foreground">
          Për të caktuar OM tjetër, kontrata aktive ndërpritet me arsye të detyrueshme. Organizata e re duhet
          ta pranojë ftesën.
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
            <Label htmlFor="inspectionTerminationReason">Arsyeja e ndërprerjes *</Label>
            <textarea
              id="inspectionTerminationReason"
              name="inspectionTerminationReason"
              value={terminationReason}
              onChange={(event) => setTerminationReason(event.target.value)}
              className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="P.sh. mosrespektim afatesh, ndryshim çmimi, mungesë disponueshmërie…"
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Arsyeja ruhet në regjistër, njoftohet OM aktuale dhe shfaqet në historikun e kontratës.
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

      <InspectionAssignmentDemoButton />

      <PeriodicControlSchedulePanel schedule={schedule} />

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold">{PERIODIC_INSPECTION_CONTRACT_LABEL}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Shfaqen vetëm organizatat OM me status <strong className="text-foreground">AKTIV</strong> dhe licencë të
          vlefshme, të regjistruara nga Drejtoria e Politikave.
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="inspectionOrgId">Organizata OM / certifikuese *</Label>
          {eligibleCertifiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nuk ka organizata OM të disponueshme. Kontaktoni Drejtorinë e Politikave për regjistrimin e licencës.
            </p>
          ) : (
            <select
              id="inspectionOrgId"
              value={inspectionOrgId}
              onChange={(event) => setInspectionOrgId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Zgjidhni OM-n</option>
              {eligibleCertifiers.map((certifier) => (
                <option key={certifier.id} value={certifier.id}>
                  {certifier.name}
                  {certifier.nipt ? ` (${certifier.nipt})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="inspectionStartDate">Data fillimit *</Label>
            <Input
              id="inspectionStartDate"
              name="inspectionStartDate"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inspectionEndDate">Data mbarimit *</Label>
            <Input
              id="inspectionEndDate"
              name="inspectionEndDate"
              type="date"
              required
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="inspectionContractNumber">Numri i kontratës</Label>
            <Input
              id="inspectionContractNumber"
              name="inspectionContractNumber"
              placeholder="Gjenerohet automatikisht nëse bosh"
            />
            <p className="text-xs text-muted-foreground">
              Dokumenti i kontratës ngarkohet nga kompania pas pranimit të ftesës.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting || !selectedCertifier}>
        {submitting
          ? "Duke dërguar…"
          : changeFromActiveContract
            ? "Ndërprit kontratën dhe dërgo ftesën e re"
            : "Cakto dhe dërgo ftesën"}
      </Button>
    </form>
  );
}
