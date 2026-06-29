import { NextRequest, NextResponse } from "next/server";
import { ApplicationType, CertificateStatus, CertificateType } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ApplicationService, ApplicationNotAccessibleError } from "@/lib/services/application-service";
import { PdfService, type RequestFormPdfVariables, type RequestFormType } from "@/lib/services/pdf-service";

type FieldChangeLike = { field?: string; label?: string; oldValue?: string; newValue?: string };

function formatDate(value?: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function resolveFormType(type: ApplicationType): RequestFormType {
  switch (type) {
    case ApplicationType.NEW_REGISTRATION:
      return "REGISTRATION_NEW";
    case ApplicationType.DEREGISTRATION:
      return "DEREGISTRATION";
    case ApplicationType.DATA_CORRECTION:
      return "CHANGE";
    case ApplicationType.DATA_UPDATE:
    case ApplicationType.MODERNIZATION:
    default:
      return "UPDATE";
  }
}

function mapDeregistrationReason(value?: string | null): RequestFormPdfVariables["deregistrationReason"] {
  switch (value) {
    case "PERMANENTLY_DISMANTLED":
      return "DISMANTLED";
    case "REPLACED_BY_NEW_UNIT":
      return "REPLACED";
    case "STRUCTURAL_CHANGES":
      return "STRUCTURAL";
    default:
      return undefined;
  }
}

function parseChanges(raw: unknown): FieldChangeLike[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is FieldChangeLike => typeof item === "object" && item !== null);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_VIEW_OWN);
    const { id } = await params;

    const application = await ApplicationService.getById(ctx, id);
    const data = application.data;
    const owner = application.ownerOrg;
    const elevator = application.targetElevator;

    const serial = data?.serialNumber ?? elevator?.technicalData?.serialNumber ?? undefined;

    // Active registration certificate (for change/update forms that reference it).
    const activeCert = elevator
      ? await db.certificate.findFirst({
          where: {
            elevatorId: elevator.id,
            type: CertificateType.REGISTRATION,
            status: CertificateStatus.ACTIVE,
          },
          orderBy: { issuedDate: "desc" },
          select: { certificateNumber: true },
        })
      : null;

    const changes = parseChanges(data?.correctionFields ?? data?.updateFields);
    const changeFrom = changes
      .map((c) => `${c.label ?? c.field ?? ""}: ${c.oldValue ?? ""}`.trim())
      .filter(Boolean)
      .join("; ");
    const changeTo = changes
      .map((c) => `${c.label ?? c.field ?? ""}: ${c.newValue ?? ""}`.trim())
      .filter(Boolean)
      .join("; ");
    const responsibleChange = changes.find(
      (c) => c.field === "responsibleEntityName" || c.field === "ownerName",
    );
    const serialChange = changes.find((c) => c.field === "serialNumber");

    const variables: RequestFormPdfVariables = {
      formType: resolveFormType(application.type),
      issuedDate: formatDate(new Date()),
      nipt: data?.responsibleEntityIdentifier ?? owner.nipt ?? "",
      ownerName: data?.responsibleEntityName ?? owner.name ?? "",
      address: data?.buildingAddress ?? owner.address ?? "",
      phone: data?.responsibleEntityPhone ?? owner.phone ?? "",
      email: data?.responsibleEntityEmail ?? owner.email ?? "",
      representedBy: owner.representativeName ?? undefined,
      installAddress: data?.buildingAddress ?? undefined,
      elevators: serial ? [serial] : undefined,
      serialNumber: serial,
      registryNumber: elevator?.registryNumber ?? undefined,
      registrationDate: formatDate(elevator?.registrationDate),
      certificateNumber: activeCert?.certificateNumber ?? undefined,
      protocolNumber: application.applicationNumber,
      changeFrom: changeFrom || undefined,
      changeTo: changeTo || undefined,
      newResponsiblePerson: responsibleChange?.newValue ?? undefined,
      newSerialNumber: serialChange?.newValue ?? undefined,
      changeReason: data?.deregistrationReason ?? data?.notes ?? undefined,
      deregistrationReason: mapDeregistrationReason(data?.deregistrationReasonType),
    };

    const pdf = await PdfService.generateRequestFormPdf(variables);
    const asciiName = `Kerkese-${application.applicationNumber}.pdf`.replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApplicationNotAccessibleError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gjenerimi i formularit dështoi";
    const status = message.includes("leje") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
