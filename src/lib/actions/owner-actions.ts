"use server";

import { ApplicationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { updateAccountProfileAction } from "@/lib/actions/account-actions";
import { ApplicationService } from "@/lib/services/application-service";
import { MaintenanceAssignmentService } from "@/lib/services/maintenance-assignment-service";
import { OrganizationService } from "@/lib/services/organization-service";
import { requirePermission, requireRole } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import {
  basicApplicationDataSchema,
  dataCorrectionSchema,
  dataUpdateSchema,
  deregistrationApplicationSchema,
  modernizationApplicationSchema,
  ownerOrgProfileSchema,
} from "@/lib/validations/owner-application";

function revalidateOwnerPaths() {
  revalidatePath("/portal/dashboard");
  revalidatePath("/portal/applications");
  revalidatePath("/portal/elevators");
  revalidatePath("/portal/notifications");
  revalidatePath("/portal/profile");
  revalidatePath("/portal/documents");
  revalidatePath("/portal/certificates");
  revalidatePath("/portal/qr-codes");
  revalidatePath("/portal/maintenance");
  revalidatePath("/portal/inspections");
  revalidatePath("/portal/history");
  revalidatePath("/portal/settings/organization");
}

export async function updateBasicApplicationDataAction(applicationId: string, formData: FormData) {
  const parsed = basicApplicationDataSchema.safeParse({
    buildingName: formData.get("buildingName") || undefined,
    buildingAddress: formData.get("buildingAddress"),
    municipalityId: formData.get("municipalityId"),
    administrativeUnitId: formData.get("administrativeUnitId") || undefined,
    entrance: formData.get("entrance") || undefined,
    floorLocation: formData.get("floorLocation") || undefined,
    buildingType: formData.get("buildingType"),
    usagePurpose: formData.get("usagePurpose"),
    responsibleEntityName: formData.get("responsibleEntityName"),
    responsibleEntityIdentifier: formData.get("responsibleEntityIdentifier"),
    responsibleEntityEmail: formData.get("responsibleEntityEmail"),
    responsibleEntityPhone: formData.get("responsibleEntityPhone"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_EDIT_DRAFT);
    await ApplicationService.updateBasicData(ctx, applicationId, parsed.data);
    revalidatePath(`/portal/applications/${applicationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ruajtja dështoi",
    };
  }
}

export async function assignCertifierAction(applicationId: string, formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_ASSIGN_CERTIFIER);
    await ApplicationService.assignCertifier(
      ctx,
      applicationId,
      String(formData.get("certifierOrgId") ?? ""),
    );
    revalidatePath(`/portal/applications/${applicationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Caktimi dështoi",
    };
  }
}

export async function createTypedApplicationAction(type: ApplicationType, elevatorId?: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_CREATE);
    const application = await ApplicationService.createDraftByType(ctx, type, { elevatorId });
    revalidateOwnerPaths();
    return { success: true as const, applicationId: application.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Krijimi dështoi",
    };
  }
}

export async function createOwnershipTransferApplicationAction(elevatorId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_CREATE);
    const application = await ApplicationService.createDraftByType(ctx, ApplicationType.DATA_UPDATE, {
      elevatorId,
    });
    await db.applicationData.update({
      where: { applicationId: application.id },
      data: { updateType: "OWNERSHIP_TRANSFER" },
    });
    revalidateOwnerPaths();
    revalidatePath(`/portal/applications/${application.id}`);
    return { success: true as const, applicationId: application.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Krijimi dështoi",
    };
  }
}

export async function createDeregistrationApplicationAction(formData: FormData) {
  const parsed = deregistrationApplicationSchema.safeParse({
    elevatorId: formData.get("elevatorId"),
    deregistrationReasonType: formData.get("deregistrationReasonType"),
    deregistrationReason: formData.get("deregistrationReason"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_CREATE);
    const application = await ApplicationService.createDraftByType(
      ctx,
      ApplicationType.DEREGISTRATION,
      { elevatorId: parsed.data.elevatorId },
    );

    const { db } = await import("@/lib/db");
    await db.applicationData.update({
      where: { applicationId: application.id },
      data: {
        deregistrationReasonType: parsed.data.deregistrationReasonType,
        deregistrationReason: parsed.data.deregistrationReason,
      },
    });

    revalidateOwnerPaths();
    return { success: true as const, applicationId: application.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Krijimi dështoi",
    };
  }
}

export async function createModernizationApplicationAction(formData: FormData) {
  const parsed = modernizationApplicationSchema.safeParse({
    elevatorId: formData.get("elevatorId"),
    modernizationType: formData.get("modernizationType"),
    modernizationNotes: formData.get("modernizationNotes"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_CREATE);
    const application = await ApplicationService.createDraftByType(
      ctx,
      ApplicationType.MODERNIZATION,
      { elevatorId: parsed.data.elevatorId },
    );

    const elevator = await db.elevator.findFirst({
      where: { id: parsed.data.elevatorId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
      include: { technicalData: true },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    await db.applicationData.update({
      where: { applicationId: application.id },
      data: {
        modernizationType: parsed.data.modernizationType,
        modernizationNotes: parsed.data.modernizationNotes,
        buildingAddress: elevator.buildingAddress,
        municipalityId: elevator.municipalityId,
        elevatorType: elevator.technicalData?.elevatorType,
        manufacturer: elevator.technicalData?.manufacturer,
        model: elevator.technicalData?.model,
        serialNumber: elevator.technicalData?.serialNumber,
        manufacturingYear: elevator.technicalData?.manufacturingYear,
        capacityKg: elevator.technicalData?.capacityKg,
        capacityPersons: elevator.technicalData?.capacityPersons,
        speedMs: elevator.technicalData?.speedMs,
        floorsServed: elevator.technicalData?.floorsServed,
        stops: elevator.technicalData?.stops,
        driveType: elevator.technicalData?.driveType,
      },
    });

    revalidateOwnerPaths();
    return { success: true as const, applicationId: application.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Krijimi dështoi",
    };
  }
}

export async function updateOwnerOrganizationAction(formData: FormData) {
  const parsed = ownerOrgProfileSchema.safeParse({
    name: formData.get("name"),
    nipt: formData.get("nipt"),
    legalForm: formData.get("legalForm") || undefined,
    address: formData.get("address"),
    municipalityId: formData.get("municipalityId"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    representativeName: formData.get("representativeName") || undefined,
    representativeNid: formData.get("representativeNid") || undefined,
    representativePhone: formData.get("representativePhone") || undefined,
    representativeEmail: formData.get("representativeEmail") || undefined,
    ownerBuildingRole: formData.get("ownerBuildingRole") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.ORG_EDIT_OWN);
    await OrganizationService.updateOwnOrganization(ctx, parsed.data);
    revalidateOwnerPaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function requestMaintenanceAssignmentAction(elevatorId: string, formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.MAINTENANCE_REQUEST_ASSIGNMENT);

    const parseDate = (value: FormDataEntryValue | null) => {
      const date = new Date(String(value ?? ""));
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const maintenanceEnabled = formData.get("maintenanceEnabled") === "true";
    const inspectionEnabled = formData.get("inspectionEnabled") === "true";
    const assignmentMode = String(formData.get("assignmentMode") ?? "different");
    const combinedContract = assignmentMode === "same" && maintenanceEnabled && inspectionEnabled;

    let maintenance:
      | { orgId: string; startDate: Date; endDate: Date; contractNumber?: string; documentId?: string }
      | undefined;
    if (maintenanceEnabled) {
      const startDate = parseDate(
        formData.get(combinedContract ? "combinedStartDate" : "maintenanceStartDate"),
      );
      const endDate = parseDate(
        formData.get(combinedContract ? "combinedEndDate" : "maintenanceEndDate"),
      );
      if (!startDate || !endDate) {
        return {
          success: false as const,
          error: combinedContract
            ? "Plotësoni datat e kontratës së shërbimeve."
            : "Plotësoni datat e kontratës së mirëmbajtjes.",
        };
      }
      maintenance = {
        orgId: String(formData.get("maintenanceOrgId") ?? ""),
        startDate,
        endDate,
        contractNumber: String(
          formData.get(combinedContract ? "combinedContractNumber" : "maintenanceContractNumber") || "",
        ) || undefined,
        documentId: String(
          formData.get(combinedContract ? "combinedDocumentId" : "maintenanceDocumentId") || "",
        ) || undefined,
      };
    }

    let inspection:
      | { orgId: string; startDate: Date; endDate: Date; contractNumber?: string; documentId?: string }
      | undefined;
    if (inspectionEnabled) {
      const startDate = parseDate(
        formData.get(combinedContract ? "combinedStartDate" : "inspectionStartDate"),
      );
      const endDate = parseDate(
        formData.get(combinedContract ? "combinedEndDate" : "inspectionEndDate"),
      );
      if (!startDate || !endDate) {
        return {
          success: false as const,
          error: combinedContract
            ? "Plotësoni datat e kontratës së shërbimeve."
            : "Plotësoni datat e kontratës së inspektimit.",
        };
      }
      inspection = {
        orgId: String(formData.get("inspectionOrgId") ?? ""),
        startDate,
        endDate,
        contractNumber: String(
          formData.get(combinedContract ? "combinedContractNumber" : "inspectionContractNumber") || "",
        ) || undefined,
        documentId: String(
          formData.get(combinedContract ? "combinedDocumentId" : "inspectionDocumentId") || "",
        ) || undefined,
      };
    }

    await MaintenanceAssignmentService.requestAssignment(ctx, {
      elevatorId,
      maintenance,
      inspection,
    });
    revalidatePath(`/portal/elevators/${elevatorId}`);
    revalidatePath(`/portal/elevators/${elevatorId}/maintenance/change`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Caktimi dështoi",
    };
  }
}

export async function updateOwnerUserProfileAction(formData: FormData) {
  return updateAccountProfileAction(formData);
}
