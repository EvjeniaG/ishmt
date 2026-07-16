import { NextResponse } from "next/server";
import { ApplicationType } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { db } from "@/lib/db";
import { PdfService } from "@/lib/services/pdf-service";
import { ApplicationService } from "@/lib/services/application-service";
import { resolveChiefInspectorDisplayName } from "@/lib/ishmt/chief-inspector";

const TYPE_LABELS: Record<ApplicationType, string> = {
  NEW_REGISTRATION: "Regjistrim i ri",
  DEREGISTRATION: "Çregjistrim",
  DATA_CORRECTION: "Ndryshim të dhënash",
  DATA_UPDATE: "Përditësim të dhënash",
  MODERNIZATION: "Modernizim",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user || !roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_REVIEW)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const application = await db.application.findFirst({
    where: { id, deletedAt: null },
    include: {
      ownerOrg: true,
      data: true,
      targetElevator: true,
      assignedInspector: { select: { firstName: true, lastName: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const reviewMeta = await ApplicationService.getInspectorReviewMetadata(id);
  const issuedDate = new Date().toLocaleDateString("sq-AL");
  const submittedAt = application.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString("sq-AL")
    : "-";

  const inspectorName = application.assignedInspector
    ? `${application.assignedInspector.firstName} ${application.assignedInspector.lastName}`.trim()
    : undefined;
  const chiefInspectorName = await resolveChiefInspectorDisplayName();

  const pdf = await PdfService.generateInspectionMemoPdf({
    applicationNumber: application.applicationNumber,
    applicationType: TYPE_LABELS[application.type] ?? application.type,
    ownerName: application.ownerOrg.name,
    registryNumber: application.targetElevator?.registryNumber ?? undefined,
    buildingAddress: application.data?.buildingAddress ?? undefined,
    submittedAt,
    issuedDate,
    inspectorName,
    chiefInspectorName,
    recommendation:
      reviewMeta.recommendation === "APPROVE"
        ? "Miratim i kërkesës"
        : reviewMeta.recommendation === "REJECT"
          ? "Refuzim i kërkesës"
          : undefined,
    summary: reviewMeta.comment ?? undefined,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="memo-${application.applicationNumber}.pdf"`,
    },
  });
}
