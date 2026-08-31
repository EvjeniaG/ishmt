import { AuditAction, OrgStatus, type Prisma } from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { OrganizationService } from "@/lib/services/organization-service";
import { LicensedCompanyRegistrationService } from "@/lib/services/licensed-company-registration-service";

export const DIRECTORATE_LICENSE_ISSUER = "Drejtoria e Politikave të Tregut të Brendshëm";

const LICENSE_PREFIX = {
  INSTALLATION: "INST",
  CERTIFICATION: "OM",
} as const;

export type DirectorateLicenseType = keyof typeof LICENSE_PREFIX;

export async function generateLicenseNumber(
  tx: Prisma.TransactionClient,
  licenseType: DirectorateLicenseType,
): Promise<string> {
  const prefix = LICENSE_PREFIX[licenseType];
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  const count = await tx.organizationLicense.count({
    where: { licenseNumber: { startsWith: base } },
  });

  for (let offset = 0; offset < 100; offset += 1) {
    const candidate = `${base}${String(count + 1 + offset).padStart(4, "0")}`;
    const taken = await tx.organizationLicense.findFirst({
      where: { licenseNumber: { equals: candidate, mode: "insensitive" } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  throw new Error("Nuk u gjenerua dot numri i licencës.");
}

function defaultExpiryDate(issuedDate: Date) {
  return new Date(issuedDate.getFullYear() + 2, issuedDate.getMonth(), issuedDate.getDate());
}

export async function issueDirectorateLicense(
  ctx: AuthContext,
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    licenseType: DirectorateLicenseType;
    issuedDate?: Date;
    expiryDate?: Date;
    scope?: string;
  },
) {
  OrganizationService.assertCanManageLicenseType(ctx, input.licenseType);

  const issuedDate = input.issuedDate ?? new Date();
  const expiryDate = input.expiryDate ?? defaultExpiryDate(issuedDate);
  const now = new Date();

  const existingActive = await tx.organizationLicense.findFirst({
    where: {
      organizationId: input.organizationId,
      licenseType: input.licenseType,
      status: OrgStatus.ACTIVE,
      expiryDate: { gte: now },
    },
  });
  if (existingActive) {
    throw new Error(
      input.licenseType === "INSTALLATION"
        ? "Kompania ka tashmë licencë aktive instalimi."
        : "Kompania ka tashmë licencë aktive OM.",
    );
  }

  const licenseNumber = await generateLicenseNumber(tx, input.licenseType);

  const license = await tx.organizationLicense.create({
    data: {
      organizationId: input.organizationId,
      licenseNumber,
      licenseType: input.licenseType,
      issuedDate,
      expiryDate,
      scope: input.scope,
      status: OrgStatus.ACTIVE,
      issuedBy: DIRECTORATE_LICENSE_ISSUER,
      createdById: ctx.userId,
    },
  });

  await AuditService.log(
    {
      actorId: ctx.userId,
      action: AuditAction.CREATE,
      entityType: "organization_license",
      entityId: license.id,
      afterState: license,
      metadata: { issuance: "DIRECTORATE_GENERATED" },
    },
    tx,
  );

  await LicensedCompanyRegistrationService.syncCapabilitiesFromLicenses(input.organizationId, undefined, tx);

  return license;
}
