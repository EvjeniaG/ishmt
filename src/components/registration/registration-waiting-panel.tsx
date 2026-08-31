"use client";

import { Clock3 } from "lucide-react";
import { RevokeDelegationForm } from "@/components/delegation/revoke-delegation-form";

type RevokeHandler = (reason: string) => Promise<{ success: boolean; error?: string }>;

export function RegistrationWaitingPanel({
  companyName,
  roleLabel = "partneri",
  onRevoke,
  mode = "delegation",
}: {
  companyName?: string | null;
  /** p.sh. "instaluesit" ose "certifikuesit" */
  roleLabel?: string;
  onRevoke?: RevokeHandler;
  /** delegation = ftesë në pritje; return-correction = IQMT kërkoi korrigjim nga partneri */
  mode?: "delegation" | "return-correction";
}) {
  return (
    <div className="reg-wizard-waiting">
      <Clock3 className="h-8 w-8 text-amber-600" aria-hidden />
      <p className="reg-wizard-waiting-title">
        {mode === "return-correction" ? `Korrigjim nga ${roleLabel}` : `Në pritje të ${roleLabel}`}
      </p>
      <p className="reg-wizard-waiting-desc">
        {mode === "return-correction" ? (
          companyName ? (
            <>
              IQMT kërkoi korrigjim nga <strong className="text-foreground">{companyName}</strong>. Do të
              njoftoheni kur të plotësojë korrigjimin dhe aplikimi të vazhdojë.
            </>
          ) : (
            <>IQMT kërkoi korrigjim nga partneri. Do të njoftoheni kur të përfundojë korrigjimi.</>
          )
        ) : companyName ? (
          <>
            Ftesa u dërgua te <strong className="text-foreground">{companyName}</strong>. Do të njoftoheni kur të
            plotësojë pjesën e tyre.
          </>
        ) : (
          <>Ftesa u dërgua. Do të njoftoheni kur partneri të përfundojë.</>
        )}
      </p>

      {onRevoke && mode === "delegation" && (
        <RevokeDelegationForm
          label="Arsyeja e tërheqjes së ftesës"
          hint="Nëse kompania nuk përgjigjet ose voneson, mund ta tërhiqni ftesën dhe të caktoni një tjetër."
          onRevoke={onRevoke}
        />
      )}
    </div>
  );
}
