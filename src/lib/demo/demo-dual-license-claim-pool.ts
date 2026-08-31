/** Kompani me licencë instalimi dhe OM në të njëjtin subjekt - për regjistrim demo. */
export type DemoDualLicenseClaimProfile = {
  orgName: string;
  nipt: string;
  installLicenseNumber: string;
  omLicenseNumber: string;
  email: string;
};

function buildDualLicenseClaimProfile(index: number): DemoDualLicenseClaimProfile {
  const seq = String(index).padStart(2, "0");
  const licenseSeq = String(index).padStart(3, "0");
  const niptDigits = String(53333332 + index).padStart(8, "0");

  return {
    orgName:
      index === 1
        ? "Shërbim Ashensorë Demo Sh.p.k."
        : `Shërbim Ashensorë Demo ${seq} Sh.p.k.`,
    nipt: `D${niptDigits}A`,
    installLicenseNumber: `INST-DEMO-DUAL-${licenseSeq}`,
    omLicenseNumber: `OM-DEMO-DUAL-${licenseSeq}`,
    email: `dual-demo-${seq}@ishmtt.test`,
  };
}

export const DEMO_DUAL_LICENSE_CLAIM_POOL: DemoDualLicenseClaimProfile[] = Array.from(
  { length: 20 },
  (_, i) => buildDualLicenseClaimProfile(i + 1),
);
