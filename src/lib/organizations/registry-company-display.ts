export type SelectableRegistryCompany = {
  id: string;
  name: string;
  nipt: string | null;
  hasPortalAccount: boolean;
};

export function formatRegistryCompanyOption(company: {
  name: string;
  nipt: string | null;
  hasPortalAccount?: boolean;
}) {
  const base = company.nipt ? `${company.nipt} · ${company.name}` : company.name;
  if (company.hasPortalAccount === false) {
    return `${base} · pa llogari portal`;
  }
  return base;
}

export function partitionRegistryCompanies<T extends SelectableRegistryCompany>(companies: T[]) {
  return {
    withAccount: companies.filter((company) => company.hasPortalAccount),
    withoutAccount: companies.filter((company) => !company.hasPortalAccount),
  };
}
