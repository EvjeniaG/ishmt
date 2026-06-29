import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicationType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { AssetGenerationStatusCard } from "@/components/applications/asset-generation-status";
import { IshmtReviewActions } from "@/components/applications/application-workflow-forms";
import { PhysicalVerificationButton } from "@/components/elevators/physical-verification-button";
import { ApplicationDocuments } from "@/components/applications/application-documents";
import { ApplicationDataSummary } from "@/components/applications/application-data-summary";
import { DossierSectionsView } from "@/components/elevators/dossier-sections-view";
import { LegalDeadlineBadge } from "@/components/applications/legal-deadline-badge";
import { DocumentService } from "@/lib/services/document-service";
import { getAuthSession } from "@/lib/auth";
import { ApplicationService, ApplicationNotAccessibleError } from "@/lib/services/application-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { getApplicationDocumentSpecs } from "@/lib/documents/application-document-checklist";
import { buildRegistrationDossier } from "@/lib/registration/build-dossier";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";

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

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_REVIEW)) {
    redirect("/unauthorized");
  }

  const application = await ApplicationService.getById(ctx, id).catch((error) => {
    if (error instanceof ApplicationNotAccessibleError) notFound();
    throw error;
  });
  const inspectorReview =
    application.status === "PENDING_CHIEF_INSPECTOR"
      ? await ApplicationService.getInspectorReviewMetadata(id)
      : null;
  const data = application.data;
  const rawDocuments = await DocumentService.listForEntity("application", id);
  const uploadedPurposes = await DocumentService.listPurposesForEntity("application", id);
  const uploadedPurposeSet = new Set(uploadedPurposes);
  const documentChecklist = getApplicationDocumentSpecs({
    type: application.type,
    data,
  }).map((item) => ({
    ...item,
    uploaded: uploadedPurposeSet.has(item.purpose),
  }));
  const documents = rawDocuments.map((doc) => ({
    ...DocumentService.serializeDocument(doc),
    uploadedAt: doc.createdAt.toISOString(),
  }));

  const isRegistration = application.type === ApplicationType.NEW_REGISTRATION;
  const correctionChanges = Array.isArray(data?.correctionFields)
    ? (data.correctionFields as FieldChange[])
    : [];
  const updateChanges = Array.isArray(data?.updateFields)
    ? (data.updateFields as FieldChange[])
    : [];

  const registrationDossierSections = isRegistration
    ? buildRegistrationDossier(application).sections
    : [];

  const certifierDisplayName = displayCertifierOrganizationName(
    application.certifierOrg?.name,
    data?.omiNumber,
  );

  return (
    <AppShell title="Shqyrtimi i aplikimit">
      <StandardPageLayout
        eyebrow="ISHMT · Shqyrtim administrativ"
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
              ["SUBMITTED", "UNDER_REVIEW", "PENDING_CHIEF_INSPECTOR"].includes(application.status) && (
              <LegalDeadlineBadge submittedAt={application.submittedAt} />
            )}
            <a
              href={`/api/applications/${id}/memo`}
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              Shkarko Memo (Aneksi 1)
            </a>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <SectionCard title="Dosja e aplikimit" subtitle="Të dhënat kryesore të parashtruara" padded>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <p><strong>Personi përgjegjës i ashensorit:</strong> {application.ownerOrg.name}</p>
                {isRegistration && (
                  <>
                    <p><strong>Instalues:</strong> {application.installerOrg?.name ?? "-"}</p>
                    <p><strong>Certifikues:</strong> {certifierDisplayName ?? "-"}</p>
                    <p><strong>Adresa:</strong> {data?.buildingAddress ?? "-"}</p>
                    <p><strong>Bashkia:</strong> {data?.municipality?.nameSq ?? "-"}</p>
                    <p><strong>Lloji:</strong> {data?.elevatorType ?? "-"}</p>
                    <p><strong>Prodhuesi:</strong> {data?.manufacturer ?? "-"}</p>
                    <p><strong>Serial:</strong> {data?.serialNumber ?? "-"}</p>
                    <p><strong>Cert. nr.:</strong> {data?.installationCertificateNumber ?? "-"}</p>
                    <p>
                      <strong>Cert. data:</strong>{" "}
                      {data?.installationCertificateDate
                        ? new Date(data.installationCertificateDate).toLocaleDateString("sq-AL")
                        : "-"}
                    </p>
                  </>
                )}
                {application.type === ApplicationType.DEREGISTRATION && (
                  <>
                    <p><strong>Ashensori:</strong> {application.targetElevator?.registryNumber ?? "-"}</p>
                    <p><strong>Arsye:</strong> {data?.deregistrationReasonType ?? "-"}</p>
                    <p className="md:col-span-2"><strong>Shpjegim:</strong> {data?.deregistrationReason ?? "-"}</p>
                  </>
                )}
                {(application.type === ApplicationType.DATA_CORRECTION ||
                  application.type === ApplicationType.DATA_UPDATE) && (
                  <>
                    <p><strong>Ashensori:</strong> {application.targetElevator?.registryNumber ?? "-"}</p>
                    {application.type === ApplicationType.DATA_UPDATE && (
                      <p><strong>Lloji përditësimi:</strong> {data?.updateType ?? "-"}</p>
                    )}
                  </>
                )}
                {application.type === ApplicationType.MODERNIZATION && (
                  <>
                    <p><strong>Ashensori:</strong> {application.targetElevator?.registryNumber ?? "-"}</p>
                    <p><strong>Instalues:</strong> {application.installerOrg?.name ?? "-"}</p>
                    <p><strong>Certifikues:</strong> {certifierDisplayName ?? "-"}</p>
                    <p>
                      <strong>Lloji modernizimit:</strong>{" "}
                      {data?.modernizationType
                        ? MODERNIZATION_TYPE_LABELS[data.modernizationType]
                        : "-"}
                    </p>
                    <p><strong>Serial (i ri):</strong> {data?.serialNumber ?? "-"}</p>
                    <p><strong>Prodhuesi:</strong> {data?.manufacturer ?? "-"}</p>
                    <p><strong>Cert. nr.:</strong> {data?.installationCertificateNumber ?? "-"}</p>
                    <p className="md:col-span-2">
                      <strong>Përshkrimi:</strong> {data?.modernizationNotes ?? "-"}
                    </p>
                  </>
                )}
              </div>
            </SectionCard>

            {application.type === ApplicationType.DATA_CORRECTION && correctionChanges.length > 0 && (
              <SectionCard title="Ndryshimet e kërkuara" subtitle="Korrigjime të dhënash" padded>
                <FieldChangesTable changes={correctionChanges} />
              </SectionCard>
            )}

            {application.type === ApplicationType.DATA_UPDATE && updateChanges.length > 0 && (
              <SectionCard title="Ndryshimet e kërkuara" subtitle="Përditësime të dhënash" padded>
                <FieldChangesTable changes={updateChanges} />
              </SectionCard>
            )}

            {isRegistration && registrationDossierSections.length > 0 ? (
              <DossierSectionsView
                sections={registrationDossierSections}
                title="Të dhënat e plota të aplikimit"
                description="Çdo fushë e plotësuar nga personi përgjegjës i ashensorit, instaluesi dhe certifikuesi"
              />
            ) : (
              <ApplicationDataSummary
                data={data}
                orgs={{
                  owner: application.ownerOrg.name,
                  installer: application.installerOrg?.name,
                  certifier: certifierDisplayName,
                }}
                title="Të dhënat e regjistruara"
              />
            )}

            <ApplicationDocuments
              applicationId={id}
              documents={documents}
              canUpload={false}
              checklist={documentChecklist}
            />

            {isRegistration && (
              <AssetGenerationStatusCard
                applicationId={id}
                status={application.assetGenerationStatus}
                error={application.assetGenerationError}
              />
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <IshmtReviewActions
              applicationId={id}
              status={application.status}
              roleCode={session.user.roleCode}
              inspectorReview={
                inspectorReview
                  ? {
                      recommendation: inspectorReview.recommendation,
                      requiresPhysicalInspection: inspectorReview.requiresPhysicalInspection,
                      comment: inspectorReview.comment,
                    }
                  : undefined
              }
            />
            {application.targetElevator?.requiresAttention && (
              <PhysicalVerificationButton elevatorId={application.targetElevator.id} />
            )}
            {application.targetElevator && (
              <SectionCard title="Dosja e ashensorit" padded>
                <Link
                  href={`/portal/elevators/${application.targetElevator.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Shiko dosjen e ashensorit →
                </Link>
              </SectionCard>
            )}
          </div>
        </div>
      </StandardPageLayout>
    </AppShell>
  );
}
