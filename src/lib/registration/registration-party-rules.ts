export const INSTALLER_CERTIFIER_CONFLICT_MESSAGE =
  "Instaluesi dhe OM duhet të jenë subjekte të ndryshme. Zgjidhni kompani të ndryshme për instalim dhe certifikim.";

export function assertInstallerDistinctFromCertifier(
  installerOrgId: string | null | undefined,
  certifierOrgId: string | null | undefined,
) {
  if (installerOrgId && certifierOrgId && installerOrgId === certifierOrgId) {
    throw new Error(INSTALLER_CERTIFIER_CONFLICT_MESSAGE);
  }
}
