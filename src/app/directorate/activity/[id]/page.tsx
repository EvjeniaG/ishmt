import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ApplicationReadOnlyDossier } from "@/components/applications/application-read-only-dossier";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { LegalDeadlineBadge } from "@/components/applications/legal-deadline-badge";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { requireDirectoratePage } from "@/lib/directorate/access";
import { ROLE_CODES } from "@/lib/constants/roles";
import { getApplicationDocumentSpecs } from "@/lib/documents/application-document-checklist";
import {
  DirectorateActivityService,
  serializeCompanyActivityQuery,
} from "@/lib/services/directorate-activity-service";
import { ApplicationService } from "@/lib/services/application-service";
import { DocumentService } from "@/lib/services/document-service";
import { ApplicationStatus } from "@prisma/client";

export default async function DirectorateActivityDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireDirectoratePage();
  const { id } = await params;
  const query = await searchParams;
  const returnQuery = serializeCompanyActivityQuery(query);

  const application = await DirectorateActivityService.getCompanyActivityById(id);
  if (!application) notFound();

  const [workflowTrail, fieldVerificationStatus] = await Promise.all([
    ApplicationService.getIshmtWorkflowTrail(id),
    ApplicationService.getApplicationFieldVerificationStatus(id),
  ]);

  const rawDocuments = await DocumentService.listForEntity("application", id);
  const linkedDocuments = await DocumentService.listLinkedForEntity("application", id);
  const uploadedPurposes = await DocumentService.listPurposesForEntity("application", id);
  const uploadedPurposeSet = new Set(uploadedPurposes);
  const data = application.data;
  const documentChecklist = getApplicationDocumentSpecs({
    type: application.type,
    data,
  });
  const documents =
    linkedDocuments.length > 0
      ? linkedDocuments
      : rawDocuments.map((doc) => ({
          purpose: undefined as string | undefined,
          ...DocumentService.serializeDocument(doc),
          uploadedAt: doc.createdAt.toISOString(),
        }));

  const elevator = application.targetElevator ?? application.originElevator;

  return (
    <AppShell title={`Dosja · ${application.applicationNumber}`}>
      <DirectoratePageShell
        title={application.applicationNumber}
        description="Dosja e plotë e aplikimit - të dhëna, dokumente dhe historik si te IQMT (lexim)."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ApplicationStatusBadge
              status={application.status}
              type={application.type}
              roleCode={ROLE_CODES.DIRECTORATE}
            />
            {application.submittedAt &&
              ([
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.PENDING_DIRECTOR,
                ApplicationStatus.PENDING_SECTOR_HEAD,
                ApplicationStatus.PENDING_FIELD_REVIEW,
                ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
                ApplicationStatus.PENDING_DIRECTOR_REPORT,
                ApplicationStatus.PENDING_CHIEF_INSPECTOR,
              ] as ApplicationStatus[]).includes(application.status) && (
                <LegalDeadlineBadge submittedAt={application.submittedAt} />
              )}
            <Link
              href={`/directorate/activity${returnQuery}`}
              className="text-sm font-medium text-gov-primary hover:underline"
            >
              ← Lista e aktivitetit
            </Link>
          </div>
        }
      >
        {elevator && (
          <p className="text-sm text-muted-foreground">
            Ashensor {elevator.registryNumber} · {application.ownerOrg.name}
          </p>
        )}

        <ApplicationReadOnlyDossier
          application={application}
          applicationId={id}
          documents={documents}
          documentChecklist={documentChecklist}
          uploadedPurposeSet={uploadedPurposeSet}
          workflowTrail={workflowTrail}
          fieldVerificationStatus={fieldVerificationStatus}
          currentUserId={session.user.id}
        />
      </DirectoratePageShell>
    </AppShell>
  );
}
