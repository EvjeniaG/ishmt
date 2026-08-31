/** Aplikime ku janë përfshirë kompanitë e licencuara (instalues ose OM) — mbikëqyrje Drejtorie. */
export function isDirectorateActivityApplication(app: {
  installerOrgId: string | null;
  certifierOrgId: string | null;
}) {
  return Boolean(app.installerOrgId || app.certifierOrgId);
}
