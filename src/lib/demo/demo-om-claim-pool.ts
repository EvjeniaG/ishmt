/** Kompani OM të licencuara pa llogari - për regjistrim dhe regjistrin e Drejtorisë. */
export type DemoOmClaimProfile = {
  orgName: string;
  nipt: string;
  licenseNumber: string;
  email: string;
};

function buildOmClaimProfile(index: number): DemoOmClaimProfile {
  const seq = String(index).padStart(2, "0");
  const licenseSeq = String(index).padStart(3, "0");
  const niptDigits = String(33333332 + index).padStart(8, "0");

  return {
    orgName:
      index === 1 ? "OM Demo Regjistrim Sh.p.k." : `OM Demo Regjistrim ${seq} Sh.p.k.`,
    nipt: `M${niptDigits}E`,
    licenseNumber: `OM-DEMO-REG-${licenseSeq}`,
    email: `om-demo-${seq}@ishmtt.test`,
  };
}

export const DEMO_OM_CLAIM_POOL: DemoOmClaimProfile[] = Array.from({ length: 20 }, (_, i) =>
  buildOmClaimProfile(i + 1),
);

/** Alias i vjetër - licenca e parë e pool-it. */
export const REGISTER_DEMO_OM_CLAIM = DEMO_OM_CLAIM_POOL[0];

let omClaimCursor = 0;

/** Zgjedh radhazi një licencë OM të lirë për plotësimin demo të regjistrimit. */
export function nextRegisterDemoOmClaim(): DemoOmClaimProfile {
  const claim = DEMO_OM_CLAIM_POOL[omClaimCursor % DEMO_OM_CLAIM_POOL.length];
  omClaimCursor += 1;
  return claim;
}

/** Rivendos rotacionin (p.sh. në teste). */
export function resetRegisterDemoOmClaimCursor() {
  omClaimCursor = 0;
}
