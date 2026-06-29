"use server";

import { OrgStatus, OrgType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { OrganizationService } from "@/lib/services/organization-service";
import { LicenseService } from "@/lib/services/license-service";
import { MembershipService } from "@/lib/services/membership-service";
import { requirePermission, requireRole } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";

export async function createLicensedCompanyAction(formData: FormData) {
  try {
    const ctx = await requireRole(ROLE_CODES.DIRECTORATE);
    const typeRaw = String(formData.get("type"));
    if (typeRaw !== "INSTALLER" && typeRaw !== "CERTIFIER") {
      return { success: false as const, error: "Lloji i pavlefshëm i kompanisë" };
    }

    await OrganizationService.createLicensedCompany(ctx, {
      type: OrgType[typeRaw],
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
    return { success: true as const };
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
      licenseNumber: String(formData.get("licenseNumber")),
      licenseType: String(formData.get("licenseType")),
      issuedDate: new Date(String(formData.get("issuedDate"))),
      expiryDate: new Date(String(formData.get("expiryDate"))),
      scope: String(formData.get("scope") || "") || undefined,
      issuedBy: "Drejtoria e Politikave të Tregut të Brendshëm",
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

    await OrganizationService.updateOwnOrganization(ctx, {
      name: String(formData.get("name") || "") || undefined,
      address: String(formData.get("address") || "") || undefined,
      phone: String(formData.get("phone") || "") || undefined,
      email: String(formData.get("email") || "") || undefined,
      municipalityId: String(formData.get("municipalityId") || "") || undefined,
    });

    revalidatePath("/portal/settings/organization");
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
