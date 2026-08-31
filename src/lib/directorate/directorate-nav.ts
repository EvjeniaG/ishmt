export const DIRECTORATE_EYEBROW = "Drejtoria e Politikave · MPB";

export type DirectorateNavTab = {
  href: string;
  label: string;
  exact?: boolean;
};

export const DIRECTORATE_COMPANY_TABS: DirectorateNavTab[] = [
  { href: "/directorate/companies", label: "Regjistri", exact: true },
  { href: "/directorate/companies/new", label: "Shto kompani" },
  { href: "/directorate/licenses", label: "Licencat" },
  { href: "/directorate/companies/suspended", label: "Pezulluar" },
];

export function directorateCompanyDetailTabs(companyId: string): DirectorateNavTab[] {
  return [
    { href: `/directorate/companies/${companyId}`, label: "Të dhënat", exact: true },
    { href: `/directorate/companies/${companyId}/licenses`, label: "Licencat" },
  ];
}
