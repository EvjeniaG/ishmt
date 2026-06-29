"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  respondCertifierDelegationAction,
  respondInstallerDelegationAction,
} from "@/lib/actions/registration-actions";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, MapPin, XCircle, Mail, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DelegationResponse({
  applicationId,
  type,
  applicationNumber,
  buildingAddress,
  municipality,
  nextPath,
}: {
  applicationId: string;
  type: "installer" | "certifier";
  applicationNumber: string;
  buildingAddress?: string | null;
  municipality?: string | null;
  nextPath: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function respond(accept: boolean) {
    setLoading(true);
    setError(null);
    const result =
      type === "installer"
        ? await respondInstallerDelegationAction(applicationId, accept)
        : await respondCertifierDelegationAction(applicationId, accept);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(accept ? nextPath : `/portal/applications/${applicationId}`);
    router.refresh();
  }

  const isInstaller = type === "installer";

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-gov-primary/10 bg-gradient-to-br from-gov-primary/[0.06] via-background to-gov-secondary/[0.04] px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gov-primary/15 bg-white/80 shadow-sm">
            <Mail className="h-6 w-6 text-gov-primary" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ftesë e re
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-gov-primary">
              {isInstaller ? "Instalim ashensori" : "Certifikim OMI"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ju është dërguar një ftesë për të marrë pjesë në procesin e regjistrimit.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile icon={Building2} label="Nr. aplikimi" value={applicationNumber} mono />
          <InfoTile icon={MapPin} label="Adresa" value={buildingAddress ?? "-"} />
          <InfoTile icon={MapPin} label="Bashkia" value={municipality ?? "-"} />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row">
          <Button
            className="h-11 flex-1 gap-2 bg-gov-primary shadow-sm hover:bg-gov-primary/90"
            disabled={loading}
            onClick={() => respond(true)}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Prano ftesën
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 gap-2 border-border/80"
            disabled={loading}
            onClick={() => respond(false)}
          >
            <XCircle className="h-4 w-4" aria-hidden />
            Refuzo
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className={cn("text-sm font-semibold text-foreground", mono && "font-mono")}>{value}</p>
    </div>
  );
}
