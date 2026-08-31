import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import {
  canApproveApplications,
  canReviewApplications,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";

/** All logged-in roles (excluding PUBLIC). */
export const ALL_AUTHENTICATED_ROLES: RoleCode[] = [
  ROLE_CODES.OWNER,
  ROLE_CODES.INSTALLER,
  ROLE_CODES.CERTIFIER,
  ROLE_CODES.MAINTENANCE,
  ROLE_CODES.FIELD_INSPECTOR,
  ROLE_CODES.SECTOR_HEAD,
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.ADMIN,
  ROLE_CODES.DIRECTORATE,
];

export const PORTAL_COMPANY_ROLES: RoleCode[] = [
  ROLE_CODES.OWNER,
  ROLE_CODES.INSTALLER,
  ROLE_CODES.CERTIFIER,
  ROLE_CODES.MAINTENANCE,
];

export const ISHMT_STAFF_ROLES: RoleCode[] = [
  ROLE_CODES.FIELD_INSPECTOR,
  ROLE_CODES.SECTOR_HEAD,
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.ADMIN,
];

export const ISHMT_APPROVER_ROLES: RoleCode[] = [ROLE_CODES.CHIEF_INSPECTOR];

export function getDashboardPathForRole(roleCode: RoleCode): string {
  switch (roleCode) {
    case ROLE_CODES.CHIEF_INSPECTOR:
      return "/ishmt/chief/dashboard";
    case ROLE_CODES.ISHMT_DIRECTOR:
      return "/ishmt/director/dashboard";
    case ROLE_CODES.ADMIN:
      return "/ishmt/admin/dashboard";
    case ROLE_CODES.SECTOR_HEAD:
      return "/ishmt/dashboard";
    case ROLE_CODES.FIELD_INSPECTOR:
      return "/ishmt/inspector/dashboard";
    case ROLE_CODES.DIRECTORATE:
      return "/directorate/dashboard";
    default:
      return "/portal/dashboard";
  }
}

export function getProfilePathForRole(_roleCode: RoleCode): string {
  return "/portal/profile";
}

export function getNotificationsPathForRole(roleCode: RoleCode): string {
  if (ISHMT_STAFF_ROLES.includes(roleCode)) {
    return "/ishmt/notifications";
  }
  return "/portal/notifications";
}

/** Rruga e kërkimit në header sipas rolit. */
export function getSearchPathForRole(roleCode: RoleCode): string | null {
  if (
    roleCode === ROLE_CODES.OWNER ||
    roleCode === ROLE_CODES.INSTALLER ||
    roleCode === ROLE_CODES.CERTIFIER
  ) {
    return "/portal/search";
  }

  if (
    ISHMT_STAFF_ROLES.includes(roleCode) ||
    roleCode === ROLE_CODES.DIRECTORATE ||
    roleCode === ROLE_CODES.INSPECTOR
  ) {
    return "/ishmt/search";
  }

  return null;
}

export function isIshmtReviewRole(roleCode: RoleCode): boolean {
  return canReviewApplications(roleCode);
}

export function isIshmtApproverRole(roleCode: RoleCode): boolean {
  return canApproveApplications(roleCode);
}

export function isIshmtFieldRole(roleCode: RoleCode): boolean {
  return isFieldInspectorRole(roleCode);
}

/** Faqja e duhur e detyrave të inspektimit në terren sipas rolit. */
export function getFieldInspectionTasksHref(
  roleCode: RoleCode,
  applicationId?: string,
): string | null {
  if (
    isFieldInspectorRole(roleCode) &&
    roleHasPermission(roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_OWN)
  ) {
    const base = "/ishmt/my-field-inspections";
    return applicationId ? `${base}?applicationId=${applicationId}` : base;
  }

  if (roleHasPermission(roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_ALL)) {
    const base = "/ishmt/field-inspections";
    return applicationId ? `${base}?applicationId=${applicationId}` : base;
  }

  return null;
}
