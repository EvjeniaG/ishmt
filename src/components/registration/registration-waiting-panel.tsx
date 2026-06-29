import { Clock3 } from "lucide-react";

export function RegistrationWaitingPanel({
  companyName,
  roleLabel = "partneri",
}: {
  companyName?: string | null;
  /** p.sh. "instaluesi" ose "certifikuesi" */
  roleLabel?: string;
}) {
  return (
    <div className="reg-wizard-waiting">
      <Clock3 className="h-8 w-8 text-amber-600" aria-hidden />
      <p className="reg-wizard-waiting-title">Në pritje të {roleLabel}</p>
      <p className="reg-wizard-waiting-desc">
        {companyName ? (
          <>
            Ftesa u dërgua te <strong className="text-foreground">{companyName}</strong>. Do të njoftoheni kur të
            plotësojë pjesën e tyre - nuk keni nevojë të bëni asgjë tani.
          </>
        ) : (
          <>Ftesa u dërgua. Do të njoftoheni kur partneri të përfundojë - nuk keni nevojë të bëni asgjë tani.</>
        )}
      </p>
    </div>
  );
}
