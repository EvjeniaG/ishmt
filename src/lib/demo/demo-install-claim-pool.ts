/** Kompani instalimi të licencuara pa llogari - për regjistrim demo. */
export type DemoInstallClaimProfile = {
  orgName: string;
  nipt: string;
  licenseNumber: string;
  email: string;
};

function buildInstallClaimProfile(index: number): DemoInstallClaimProfile {
  const seq = String(index).padStart(2, "0");
  const licenseSeq = String(index).padStart(3, "0");
  const niptDigits = String(43333332 + index).padStart(8, "0");

  return {
    orgName:
      index === 1
        ? "Instalim Demo Regjistrim Sh.p.k."
        : `Instalim Demo Regjistrim ${seq} Sh.p.k.`,
    nipt: `L${niptDigits}A`,
    licenseNumber: `INST-DEMO-REG-${licenseSeq}`,
    email: `install-demo-${seq}@ishmtt.test`,
  };
}

export const DEMO_INSTALL_CLAIM_POOL: DemoInstallClaimProfile[] = Array.from({ length: 20 }, (_, i) =>
  buildInstallClaimProfile(i + 1),
);

let installClaimCursor = 0;

export function nextRegisterDemoInstallClaim() {
  const claim = DEMO_INSTALL_CLAIM_POOL[installClaimCursor % DEMO_INSTALL_CLAIM_POOL.length];
  installClaimCursor += 1;
  return claim;
}

export function resetRegisterDemoInstallClaimCursor() {
  installClaimCursor = 0;
}
