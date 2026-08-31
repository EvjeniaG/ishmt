import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicationType, ApplicationStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { AssetGenerationStatusCard } from "@/components/applications/asset-generation-status";
import { IshmtReviewActions } from "@/components/applications/application-workflow-forms";
import { PhysicalVerificationButton } from "@/components/elevators/physical-verification-button";
import { ApplicationDocumentChecklistView } from "@/components/applications/application-document-checklist-view";
import { RegistrationDossierView } from "@/components/registration/registration-dossier-view";
import { WorkflowSection } from "@/components/applications/workflow-section";
import { LegalDeadlineBadge } from "@/components/applications/legal-deadline-badge";
import { DocumentService } from "@/lib/services/document-service";
import { getAuthSession } from "@/lib/auth";
import { ApplicationService, ApplicationNotAccessibleError } from "@/lib/services/application-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { canReviewApplications, canDirectApplications } from "@/lib/permissions/ishmt-roles";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { ApplicationDocuments } from "@/components/applications/application-documents";
import { ApplicationDataSummary } from "@/components/applications/application-data-summary";
import { IshmtWorkflowTrail } from "@/components/applications/ishmt-workflow-trail";
import { ApplicationFieldVerificationCard } from "@/components/applications/application-field-verification-card";
import { getApplicationDocumentSpecs, getPhaseDocumentChecklist } from "@/lib/documents/application-document-checklist";
import { buildRegistrationDossier } from "@/lib/registration/build-dossier";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";
import { FieldInspectorReviewBriefing } from "@/components/applications/field-inspector-review-briefing";
import { InspectorDossierTasksPanel } from "@/components/applications/inspector-dossier-tasks-panel";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";
import { getFieldInspectionTasksHref } from "@/lib/permissions/nav-paths";
import { ishmtReviewHasActionPanel } from "@/lib/ishmt/review-actions-visibility";
import { FieldInspectorWorkloadService } from "@/lib/services/field-inspector-workload-service";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  NEW_REGISTRATION: "Regjistrim i ri",
  DEREGISTRATION: "Çregjistrim",
  DATA_CORRECTION: "Ndryshim të dhënash",
  DATA_UPDATE: "Përditësim të dhënash",
  MODERNIZATION: "Modernizim",
};

function FieldChangesTable({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) return null;
  return (
    <PortalTableWrap>
      <thead>
        <tr>
          <th>Fusha</th>
          <th>Vlera e vjetër</th>
          <th>Vlera e re</th>
          <th>Arsyeja</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr key={c.field}>
            <td className="font-medium">{c.label ?? c.field}</td>
            <td className="text-muted-foreground">{c.oldValue ?? "-"}</td>
            <td>{c.newValue}</td>
            <td className="text-muted-foreground">{c.reason ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </PortalTableWrap>
  );
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? "",
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    activeOrgId: session.user.activeOrgId,
    activeOrgType: session.user.activeOrgType,
    activeOrgName: session.user.activeOrgName,
    roleCode: session.user.roleCode,
    permissions: session.user.permissions,
  };

  if (
    !roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_REVIEW) &&
    !roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_APPROVE)
  ) {
    redirect("/unauthorized");
  }

  const application = await ApplicationService.getById(ctx, id).catch((error) => {
    if (error instanceof ApplicationNotAccessibleError) notFound();
    throw error;
  });
  if (isFieldInspectorRole(session.user.roleCode)) {
    await ApplicationService.reconcileSupersededFieldReviewAssignments(id);
  }
  const directorReview =
    application.status === ApplicationStatus.PENDING_CHIEF_INSPECTOR
      ? await ApplicationService.getInspectorReviewMetadata(id)
      : null;
  const fieldReviewAssignments = await ApplicationService.getFieldReviewAssignments(id);
  const workflowTrail = await ApplicationService.getIshmtWorkflowTrail(id);
  const fieldVerificationStatus = await ApplicationService.getApplicationFieldVerificationStatus(id);
  const needsInspectorList =
    canReviewApplications(session.user.roleCode) ||
    canDirectApplications(session.user.roleCode) ||
    session.user.roleCode === "CHIEF_INSPECTOR";
  const availableInspectors = needsInspectorList
    ? await ApplicationService.listFieldInspectors(session.user.activeOrgId)
    : [];
  const plannedInspectorIds = Array.isArray(application.plannedInspectorIds)
    ? (application.plannedInspectorIds as string[])
    : null;
  const myFieldReviewAssignmentId =
    fieldReviewAssignments.find(
      (a) => a.inspectorId === session.user.id && a.status === "PENDING",
    )?.id ?? null;
  const inspectorDossierContext = isFieldInspectorRole(session.user.roleCode)
    ? await FieldInspectorWorkloadService.getApplicationContextForInspector(ctx, id)
    : null;
  const data = application.data;
  const isRegistration = application.type === ApplicationType.NEW_REGISTRATION;
  const registrationDossierSections = isRegistration
    ? buildRegistrationDossier(application).sections
    : [];

  const rawDocuments = await DocumentService.listForEntity("application", id);
  const linkedDocuments = await DocumentService.listLinkedForEntity("application", id);
  const uploadedPurposes = await DocumentService.listPurposesForEntity("application", id);
  const uploadedPurposeSet = new Set(uploadedPurposes);
  const documentChecklist = getApplicationDocumentSpecs({
    type: application.type,
    data,
  }).map((item) => ({
    ...item,
    uploaded: uploadedPurposeSet.has(item.purpose),
  }));
  const documents =
    linkedDocuments.length > 0
      ? linkedDocuments
      : rawDocuments.map((doc) => ({
          purpose: undefined as string | undefined,
          ...DocumentService.serializeDocument(doc),
          uploadedAt: doc.createdAt.toISOString(),
        }));

  const ownerChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "owner", type: application.type, data }).map((item) => ({
        ...item,
        uploaded: uploadedPurposeSet.has(item.purpose),
      }))
    : documentChecklist.filter((item) => item.phase === "owner");
  const installerChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "installer", type: application.type, data }).map((item) => ({
        ...item,
        uploaded: uploadedPurposeSet.has(item.purpose),
      }))
    : documentChecklist.filter((item) => item.phase === "installer");
  const certifierChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "certifier", type: application.type, data }).map((item) => ({
        ...item,
        uploaded: uploadedPurposeSet.has(item.purpose),
      }))
    : documentChecklist.filter((item) => item.phase === "certifier");

  const registrationDocSlots =
    isRegistration && registrationDossierSections.length > 0
      ? {
          ownerDocsSlot:
            ownerChecklist.length > 0 ? (
              <ApplicationDocumentChecklistView
                applicationId={id}
                checklist={ownerChecklist}
                documents={documents}
                currentUserId={session.user.id}
                supplementaryPhase="owner"
              />
            ) : undefined,
          installerDocsSlot:
            installerChecklist.length > 0 ? (
              <ApplicationDocumentChecklistView
                applicationId={id}
                checklist={installerChecklist}
                documents={documents}
                currentUserId={session.user.id}
                supplementaryPhase="installer"
              />
            ) : undefined,
          certifierDocsSlot:
            certifierChecklist.length > 0 ? (
              <ApplicationDocumentChecklistView
                applicationId={id}
                checklist={certifierChecklist}
                documents={documents}
                currentUserId={session.user.id}
                supplementaryPhase="certifier"
              />
            ) : undefined,
        }
      : null;

  const correctionChanges = Array.isArray(data?.correctionFields)
    ? (data.correctionFields as FieldChange[])
    : [];
  const updateChanges = Array.isArray(data?.updateFields)
    ? (data.updateFields as FieldChange[])
    : [];

  const certifierDisplayName = displayCertifierOrganizationName(
    application.certifierOrg?.name,
    data?.omiNumber,
  );

  const hasActionPanel = ishmtReviewHasActionPanel({
    status: application.status,
    roleCode: session.user.roleCode,
    myFieldReviewAssignmentId,
    inspectorAssignmentLockedBy: application.inspectorAssignmentLockedBy,
    plannedInspectorIds,
  });
  const focusedDossier = !hasActionPanel;

  const elevatorAsideExtras =
    application.targetElevator?.requiresAttention || application.targetElevator ? (
      <>
        {application.targetElevator?.requiresAttention && (
          <PhysicalVerificationButton elevatorId={application.targetElevator.id} />
        )}
        {application.targetElevator && (
          <div className="reg-wizard-panel shrink-0">
            <div className="reg-wizard-body">
              <p className="text-sm font-semibold text-foreground">Dosja e ashensorit</p>
              <Link
                href={`/portal/elevators/${application.targetElevator.id}`}
                className="mt-2 inline-block text-sm text-gov-primary hover:underline"
              >
                Shiko dosjen e ashensorit →
              </Link>
            </div>
          </div>
        )}
      </>
    ) : null;

  return (
    <AppShell title="Shqyrtimi i aplikimit">
      <StandardPageLayout
        eyebrow="IQMT · Shqyrtim administrativ"
        title={application.applicationNumber}
        description={TYPE_LABELS[application.type] ?? application.type}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ApplicationStatusBadge
              status={application.status}
              type={application.type}
              roleCode={session.user.roleCode}
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
          </div>
        }
      >
        <div
          className={cn(
            focusedDossier
              ? "mx-auto w-full max-w-5xl space-y-6"
              : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_28rem]",
          )}
        >
          <div
            className={cn(
              "min-w-0 space-y-6",
            )}
          >
            {isFieldInspectorRole(session.user.roleCode) && inspectorDossierContext ? (
              <InspectorDossierTasksPanel
                applicationId={id}
                requiresFieldVerification={inspectorDossierContext.requiresFieldVerification}
                documentReview={inspectorDossierContext.documentReview}
                fieldInspection={inspectorDossierContext.fieldInspection}
              />
            ) : null}

            {isFieldInspectorRole(session.user.roleCode) &&
              application.status === ApplicationStatus.PENDING_FIELD_REVIEW &&
              myFieldReviewAssignmentId && (
                <FieldInspectorReviewBriefing
                  requiresFieldVerification={application.requiresFieldVerification}
                />
              )}

            {isRegistration && registrationDossierSections.length > 0 && registrationDocSlots ? (
              <div className="reg-wizard-panel">
                <div className="reg-wizard-body">
                  <RegistrationDossierView
                    sections={registrationDossierSections}
                    ownerDocsSlot={registrationDocSlots.ownerDocsSlot}
                    installerDocsSlot={registrationDocSlots.installerDocsSlot}
                    certifierDocsSlot={registrationDocSlots.certifierDocsSlot}
                  />
                </div>
              </div>
            ) : (
              <>
                <WorkflowSection
                  title="Dosja e aplikimit"
                  description="Të dhënat kryesore të parashtruara"
                >
                  <div className="workflow-data-grid">
                    <div className="workflow-data-cell">
                      <p className="workflow-data-label">Personi përgjegjës i ashensorit</p>
                      <p className="workflow-data-value">{application.ownerOrg.name}</p>
                    </div>
                    {application.type === ApplicationType.DEREGISTRATION && (
                      <>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Ashensori</p>
                          <p className="workflow-data-value">{application.targetElevator?.registryNumber ?? "-"}</p>
                        </div>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Arsye</p>
                          <p className="workflow-data-value">{data?.deregistrationReasonType ?? "-"}</p>
                        </div>
                        <div className="workflow-data-cell md:col-span-2">
                          <p className="workflow-data-label">Shpjegim</p>
                          <p className="workflow-data-value">{data?.deregistrationReason ?? "-"}</p>
                        </div>
                      </>
                    )}
                    {(application.type === ApplicationType.DATA_CORRECTION ||
                      application.type === ApplicationType.DATA_UPDATE) && (
                      <>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Ashensori</p>
                          <p className="workflow-data-value">{application.targetElevator?.registryNumber ?? "-"}</p>
                        </div>
                        {application.type === ApplicationType.DATA_UPDATE && (
                          <div className="workflow-data-cell">
                            <p className="workflow-data-label">Lloji përditësimi</p>
                            <p className="workflow-data-value">{data?.updateType ?? "-"}</p>
                          </div>
                        )}
                      </>
                    )}
                    {application.type === ApplicationType.MODERNIZATION && (
                      <>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Ashensori</p>
                          <p className="workflow-data-value">{application.targetElevator?.registryNumber ?? "-"}</p>
                        </div>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Instalues</p>
                          <p className="workflow-data-value">{application.installerOrg?.name ?? "-"}</p>
                        </div>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Certifikues</p>
                          <p className="workflow-data-value">{certifierDisplayName ?? "-"}</p>
                        </div>
                        <div className="workflow-data-cell">
                          <p className="workflow-data-label">Lloji modernizimit</p>
                          <p className="workflow-data-value">
                            {data?.modernizationType
                              ? MODERNIZATION_TYPE_LABELS[data.modernizationType]
                              : "-"}
                          </p>
                        </div>
                        <div className="workflow-data-cell md:col-span-2">
                          <p className="workflow-data-label">Përshkrimi</p>
                          <p className="workflow-data-value">{data?.modernizationNotes ?? "-"}</p>
                        </div>
                      </>
                    )}
                  </div>
                </WorkflowSection>

                <ApplicationDataSummary
                  data={data}
                  orgs={{
                    owner: application.ownerOrg.name,
                    installer: application.installerOrg?.name,
                    certifier: certifierDisplayName,
                  }}
                  title="Të dhënat e regjistruara"
                />

                <ApplicationDocuments
                  applicationId={id}
                  documents={documents}
                  canUpload={false}
                  checklist={documentChecklist}
                  sectionTitle="Dokumentet"
                  sectionDescription="Dosja e ngarkuar në aplikim"
                  showAllSupplementary
                />
              </>
            )}

            {application.type === ApplicationType.DATA_CORRECTION && correctionChanges.length > 0 && (
              <WorkflowSection title="Ndryshimet e kërkuara" description="Korrigjime të dhënash">
                <FieldChangesTable changes={correctionChanges} />
              </WorkflowSection>
            )}

            {application.type === ApplicationType.DATA_UPDATE && updateChanges.length > 0 && (
              <WorkflowSection title="Ndryshimet e kërkuara" description="Përditësime të dhënash">
                <FieldChangesTable changes={updateChanges} />
              </WorkflowSection>
            )}

            {isRegistration && (
              <AssetGenerationStatusCard
                applicationId={id}
                status={application.assetGenerationStatus}
                error={application.assetGenerationError}
              />
            )}

            <ApplicationFieldVerificationCard
              status={fieldVerificationStatus}
              tasksHref={getFieldInspectionTasksHref(session.user.roleCode, id)}
            />

            <IshmtWorkflowTrail
              history={workflowTrail.history}
              fieldAssignments={workflowTrail.fieldAssignments}
              inspectorNames={workflowTrail.inspectorNames}
              lockedBy={workflowTrail.lockedBy}
              plannedInspectorIds={workflowTrail.plannedInspectorIds}
            />

            {focusedDossier && elevatorAsideExtras ? (
              <div className="space-y-6">{elevatorAsideExtras}</div>
            ) : null}
          </div>

          {!focusedDossier ? (
          <aside className="flex w-full min-w-0 max-w-full flex-col gap-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-2rem)] lg:w-full lg:max-w-[26rem] lg:self-start lg:overflow-hidden xl:max-w-[28rem]">
            <div className="min-h-0 flex-1 overflow-hidden">
              <IshmtReviewActions
              applicationId={id}
              status={application.status}
              roleCode={session.user.roleCode}
              requiredInspectorCount={application.requiredFieldInspectorCount}
              plannedInspectorIds={plannedInspectorIds}
              inspectorAssignmentLockedBy={application.inspectorAssignmentLockedBy}
              initialRequiresFieldVerification={application.requiresFieldVerification}
              fieldVerificationRequestedBy={application.fieldVerificationRequestedBy}
              fieldVerificationCanApprove={fieldVerificationStatus.canApprove}
              fieldReviewAssignments={fieldReviewAssignments.map((a) => ({
                id: a.id,
                inspectorId: a.inspectorId,
                status: a.status,
                reportText: a.reportText,
                inspector: a.inspector,
              }))}
              availableInspectors={availableInspectors}
              myFieldReviewAssignmentId={myFieldReviewAssignmentId}
              directorReview={
                directorReview
                  ? { comment: directorReview.comment }
                  : undefined
              }
            />
            </div>
            {elevatorAsideExtras}
          </aside>
          ) : null}
        </div>
      </StandardPageLayout>
    </AppShell>
  );
}
