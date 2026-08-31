import {
  LicensedCompanyRegistrationService,
  type LicensedCompanyLookupStatus,
} from "@/lib/services/licensed-company-registration-service";

export type OmLicenseLookupStatus = LicensedCompanyLookupStatus;

export class OmLicenseRegistrationService {
  static lookupLicenseStatus(input: { licenseNumber: string; nipt?: string }) {
    return LicensedCompanyRegistrationService.lookupLicenseStatus({
      ...input,
      licenseKind: "CERTIFICATION",
    });
  }

  static validateClaim(input: { licenseNumber: string; nipt: string }) {
    return LicensedCompanyRegistrationService.validateClaim({
      ...input,
      licenseKind: "CERTIFICATION",
    });
  }
}

export class InstallLicenseRegistrationService {
  static lookupLicenseStatus(input: { licenseNumber: string; nipt?: string }) {
    return LicensedCompanyRegistrationService.lookupLicenseStatus({
      ...input,
      licenseKind: "INSTALLATION",
    });
  }

  static validateClaim(input: { licenseNumber: string; nipt: string }) {
    return LicensedCompanyRegistrationService.validateClaim({
      ...input,
      licenseKind: "INSTALLATION",
    });
  }
}
