"use server";

import { OrgStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { OrganizationService } from "@/lib/services/organization-service";
import { LicenseService } from "@/lib/services/license-service";
import { MembershipService } from "@/lib/services/membership-service";
import { requirePermission, requireRole } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { companyOrgProfileSchema } from "@/lib/validations/account-profile";
import { capabilitiesFromFormData } from "@/lib/organizations/org-capabilities";
import {
  buildDirectorateCompanyDemoPrefill,
  type DirectorateCompanyDemoMode,
} from "@/lib/demo/directorate-company-demo-prefill";

export async function fetchDirectorateCompanyDemoPrefillAction(mode: DirectorateCompanyDemoMode) {
  try {
    await requireRole(ROLE_CODES.DIRECTORATE);
    const data = await buildDirectorateCompanyDemoPrefill(mode);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Plotësimi demo dështoi",
    };
  }
}

export async function checkDirectorateCreateCompanyNiptAction(nipt: string) {
  try {
    await requireRole(ROLE_CODES.DIRECTORATE);
    const result = await OrganizationService.checkNiptForDirectorateCreate(nipt);
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Verifikimi i NIPT-it dështoi",
    };
  }
}

export async function lookupDirectorateLicenseOrgAction(nipt: string) {
  try {
    await requireRole(ROLE_CODES.DIRECTORATE);
    const org = await OrganizationService.findPortalServiceOrgByNipt(nipt);
    if (!org) {
      return {
        success: false as const,
        error: "Nuk u gjet kompani shërbimi me këtë NIPT në portal.",
      };
    }
    return {
      success: true as const,
      data: { organizationId: org.id, name: org.name },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kërkimi dështoi",
    };
  }
}

export async function createLicensedCompanyAction(formData: FormData) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    const capabilities = capabilitiesFromFormData(formData);

    const org = await OrganizationService.createLicensedCompany(ctx, {
      capabilities,
      name: String(formData.get("name")),
      nipt: String(formData.get("nipt") || "") || undefined,
      municipalityId: String(formData.get("municipalityId") || "") || undefined,
      address: String(formData.get("address") || "") || undefined,
      phone: String(formData.get("phone") || "") || undefined,
      email: String(formData.get("email") || "") || undefined,
      adminEmail: String(formData.get("adminEmail") || "") || undefined,
      adminFirstName: String(formData.get("adminFirstName") || "") || undefined,
      adminLastName: String(formData.get("adminLastName") || "") || undefined,
    });

    revalidatePath("/directorate/companies");
    return {
      success: true as const,
      data: {
        organizationId: org.id,
        licenses: org.issuedLicenses,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Krijimi dështoi",
    };
  }
}

export async function updateLicensedCompanyAction(id: string, formData: FormData) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);

    await OrganizationService.updateLicensedCompany(ctx, id, {
      name: String(formData.get("name") || ""),
      nipt: String(formData.get("nipt") || "") || undefined,
      municipalityId: String(formData.get("municipalityId") || "") || undefined,
      address: String(formData.get("address") || "") || undefined,
      phone: String(formData.get("phone") || "") || undefined,
      email: String(formData.get("email") || "") || undefined,
      status: (formData.get("status") as OrgStatus) || undefined,
    });

    revalidatePath(`/directorate/companies/${id}`);
    revalidatePath("/directorate/companies");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function createLicenseAction(organizationId: string, formData: FormData) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);

    await LicenseService.create(ctx, {
      organizationId,
      licenseType: String(formData.get("licenseType")),
      issuedDate: new Date(String(formData.get("issuedDate"))),
      expiryDate: new Date(String(formData.get("expiryDate"))),
      scope: String(formData.get("scope") || "") || undefined,
    });

    revalidatePath(`/directorate/companies/${organizationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Licenca nuk u krijua",
    };
  }
}

export async function suspendLicenseAction(licenseId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    const license = await LicenseService.suspendLicense(ctx, licenseId, reason);

    revalidatePath(`/directorate/companies/${license.organizationId}`);
    revalidatePath(`/directorate/companies/${license.organizationId}/licenses`);
    revalidatePath("/directorate/companies");
    revalidatePath("/directorate/activity");
    revalidatePath("/directorate/dashboard");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Pezullimi i licencës dështoi",
    };
  }
}

export async function reinstateLicenseAction(licenseId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    const license = await LicenseService.reinstateLicense(ctx, licenseId, reason);

    revalidatePath(`/directorate/companies/${license.organizationId}`);
    revalidatePath(`/directorate/companies/${license.organizationId}/licenses`);
    revalidatePath("/directorate/companies");
    revalidatePath("/directorate/activity");
    revalidatePath("/directorate/dashboard");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Riaktivizimi i licencës dështoi",
    };
  }
}

export async function revokeLicenseAction(licenseId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    const license = await LicenseService.revokeLicense(ctx, licenseId, reason);

    revalidatePath(`/directorate/companies/${license.organizationId}`);
    revalidatePath(`/directorate/companies/${license.organizationId}/licenses`);
    revalidatePath("/directorate/companies");
    revalidatePath("/directorate/activity");
    revalidatePath("/directorate/dashboard");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Revokimi i licencës dështoi",
    };
  }
}

export async function suspendCompanyAction(organizationId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    await OrganizationService.suspendCompany(ctx, organizationId, reason);
    revalidateCompanyPaths(organizationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Pezullimi dështoi",
    };
  }
}

export async function revokeCompanyAction(organizationId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    await OrganizationService.revokeCompany(ctx, organizationId, reason);
    revalidateCompanyPaths(organizationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Revokimi i kompanisë dështoi",
    };
  }
}

export async function reinstateCompanyAction(organizationId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    await OrganizationService.reinstateCompany(ctx, organizationId, reason);
    revalidateCompanyPaths(organizationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Riaktivizimi dështoi",
    };
  }
}

export async function rejectCompanyAction(organizationId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    await OrganizationService.rejectCompany(ctx, organizationId, reason);
    revalidateCompanyPaths(organizationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Refuzimi dështoi",
    };
  }
}

function revalidateCompanyPaths(organizationId: string) {
  revalidatePath(`/directorate/companies/${organizationId}`);
  revalidatePath(`/directorate/companies/${organizationId}/licenses`);
  revalidatePath("/directorate/companies");
  revalidatePath("/directorate/activity");
  revalidatePath("/directorate/dashboard");
}

export async function updateOwnOrganizationAction(formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.ORG_EDIT_OWN);

    await OrganizationService.updateCompanyOrganization(ctx, {
      name: String(formData.get("name") || ""),
    });

    revalidatePath("/portal/profile");
    revalidatePath("/portal/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function updateCompanyOrganizationProfileAction(formData: FormData) {
  const parsed = companyOrgProfileSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.ORG_EDIT_OWN);
    await OrganizationService.updateCompanyOrganization(ctx, parsed.data);
    revalidatePath("/portal/profile");
    revalidatePath("/portal/settings/organization");
    revalidatePath("/portal/dashboard");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function inviteMemberAction(formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MEMBERS_MANAGE);

    await MembershipService.inviteMember(ctx, {
      email: String(formData.get("email")),
      firstName: String(formData.get("firstName")),
      lastName: String(formData.get("lastName")),
      roleCode: ctx.roleCode,
    });

    revalidatePath("/portal/settings/members");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ftesa dështoi",
    };
  }
}
