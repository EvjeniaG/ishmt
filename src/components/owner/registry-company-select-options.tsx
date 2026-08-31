import {
  formatRegistryCompanyOption,
  partitionRegistryCompanies,
  type SelectableRegistryCompany,
} from "@/lib/organizations/registry-company-display";

export function RegistryCompanySelectOptions({
  companies,
}: {
  companies: SelectableRegistryCompany[];
}) {
  const { withAccount, withoutAccount } = partitionRegistryCompanies(companies);

  return (
    <>
      {withAccount.length > 0 ? (
        <optgroup label="Me llogari në portal">
          {withAccount.map((company) => (
            <option key={company.id} value={company.id}>
              {formatRegistryCompanyOption(company)}
            </option>
          ))}
        </optgroup>
      ) : null}
      {withoutAccount.length > 0 ? (
        <optgroup label="Pa llogari portal (regjistruar në Drejtori)">
          {withoutAccount.map((company) => (
            <option key={company.id} value={company.id}>
              {formatRegistryCompanyOption(company)}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
}
