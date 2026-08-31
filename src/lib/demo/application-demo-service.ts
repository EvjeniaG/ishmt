import {
  ApplicationStatus,
  ApplicationType,
  DataUpdateType,
  DeregistrationReason,
  ModernizationType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { DocumentService } from "@/lib/services/document-service";
import { minimalDemoPdfBuffer } from "@/lib/demo/minimal-pdf";
import { RegistrationDemoService } from "@/lib/demo/registration-demo-service";
import { resolveDemoCertifierOrganization, resolveDemoInstallerOrganization, resolveDemoOwnershipRecipientOrganization } from "@/lib/demo/demo-seed-orgs";
import { DEMO_OWNER_CONSTRUCTION } from "@/lib/demo/demo-seed-profiles";
import type { ApplicationDemoStep } from "@/lib/demo/application-demo-steps";
import { isDemoToolsEnabled } from "@/lib/demo/application-demo-steps";
import type { RegistrationDemoStep } from "@/lib/demo/registration-demo-steps";
import type { AuthContext } from "@/lib/permissions/guards";
import { getApplicationDocumentSpecs } from "@/lib/documents/application-document-checklist";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";

export type ApplicationDemoFillResult = {
  step: ApplicationDemoStep;
  refreshPage?: boolean;
  prefilledOrgField?: "installerOrgId" | "certifierOrgId";
  prefilledOrgId?: string;
  prefilledOrgQuery?: string;
  prefilledRecipientNipt?: string;
  prefilledTransferReason?: string;
};

function isRegistrationStep(step: ApplicationDemoStep): step is RegistrationDemoStep {
  return [
    "owner-basic-data",
    "owner-assign-installer",
    "installer-technical",
    "owner-assign-certifier",
    "certifier-certification",
    "owner-pre-submit",
  ].includes(step);
}

export class ApplicationDemoService {
  static assertEnabled() {
    if (!isDemoToolsEnabled()) {
      throw new Error("Mjetet demo janë të çaktivizuara në production.");
    }
  }

  static async uploadAllRequiredDocs(
    ctx: AuthContext,
    applicationId: string,
    type: ApplicationType,
    data?: Parameters<typeof getApplicationDocumentSpecs>[0]["data"],
  ) {
    const specs = getApplicationDocumentSpecs({ type, data }).filter((s) => s.required);
    const uploaded = new Set(await DocumentService.listPurposesForEntity("application", applicationId));
    const pdf = minimalDemoPdfBuffer();

    for (const spec of specs) {
      if (uploaded.has(spec.purpose)) continue;
      await DocumentService.uploadAndLink(ctx, {
        buffer: pdf,
        originalFilename: `demo-${spec.purpose.toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        classification: spec.classification,
        entityType: "application",
        entityId: applicationId,
        purpose: spec.purpose,
      });
    }
  }

  static async fillStepFields(
    ctx: AuthContext,
    applicationId: string,
    step: ApplicationDemoStep,
  ): Promise<ApplicationDemoFillResult> {
    this.assertEnabled();

    if (isRegistrationStep(step)) {
      const result = await RegistrationDemoService.fillStepFields(ctx, applicationId, step);
      return { ...result, step };
    }

    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true, targetElevator: { include: { technicalData: true } } },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    switch (step) {
      case "modernization-data": {
        await db.applicationData.update({
          where: { applicationId },
          data: {
            modernizationType: ModernizationType.CONTROL_PANEL_CHANGE,
            modernizationNotes: "Modernizim demo - zëvendësim i sistemit të komandës dhe panelit.",
          },
        });
        return { step, refreshPage: true };
      }

      case "modernization-installer": {
        const installer = await resolveDemoInstallerOrganization();
        if (!installer) {
          throw new Error(
            "Nuk u gjet instalues demo - ekzekutoni seed-demo (Ashensorë Pro, Lift Master ose Euro Ashensorë).",
          );
        }
        return {
          step,
          prefilledOrgField: "installerOrgId",
          prefilledOrgId: installer.id,
          prefilledOrgQuery: installer.nipt ?? installer.name,
        };
      }

      case "modernization-certifier": {
        const certifier = await resolveDemoCertifierOrganization();
        if (!certifier) {
          throw new Error(
            "Nuk u gjet certifikues demo - ekzekutoni seed-demo (OM Certifikim, Inspekt OM ose Quality Lift).",
          );
        }
        return { step, prefilledOrgField: "certifierOrgId", prefilledOrgId: certifier.id };
      }

      case "correction-fields": {
        const td = application.targetElevator?.technicalData;
        const changes: FieldChange[] = [
          {
            field: "manufacturer",
            label: "Marka/Prodhuesi",
            oldValue: td?.manufacturer ?? "Panasonic",
            newValue: "KONE",
            reason: "Gabim në regjistrim fillestar - demo.",
          },
        ];
        await db.applicationData.update({
          where: { applicationId },
          data: { correctionFields: changes },
        });
        return { step, refreshPage: true };
      }

      case "update-type": {
        await db.applicationData.update({
          where: { applicationId },
          data: { updateType: DataUpdateType.ADDRESS_CHANGE },
        });
        return { step, refreshPage: true };
      }

      case "update-fields": {
        const td = application.targetElevator?.technicalData;
        const changes: FieldChange[] = [
          {
            field: "buildingAddress",
            label: "Vendndodhja (adresa)",
            oldValue: application.targetElevator?.buildingAddress ?? "Adresa e vjetër",
            newValue: "Rruga Demo Nr. 10, Tiranë",
            reason: "Ndryshim adrese - demo.",
          },
        ];
        await db.applicationData.update({
          where: { applicationId },
          data: { updateFields: changes },
        });
        return { step, refreshPage: true };
      }

      case "ownership-recipient": {
        const recipient = await resolveDemoOwnershipRecipientOrganization();
        if (!recipient?.nipt) {
          throw new Error(
            "Nuk u gjet marrësi demo (Kompani Ndërtimi) - ekzekutoni seed-demo me përdoruesin e dytë të pronarit.",
          );
        }
        return {
          step,
          prefilledRecipientNipt: DEMO_OWNER_CONSTRUCTION.nid ?? recipient.nipt,
          prefilledTransferReason:
            "Transferim demo te kompania e ndërtimit për testim të pipeline-it të IQMT.",
        };
      }

      case "lifecycle-documents": {
        if (
          application.type === ApplicationType.DEREGISTRATION &&
          !application.data?.deregistrationReasonType
        ) {
          await db.applicationData.update({
            where: { applicationId },
            data: {
              deregistrationReasonType: DeregistrationReason.PERMANENTLY_DISMANTLED,
              deregistrationReason: "Ashensori u çmontua - të dhëna demo për testim.",
            },
          });
        }
        const refreshed = await db.applicationData.findUnique({ where: { applicationId } });
        await this.uploadAllRequiredDocs(ctx, applicationId, application.type, refreshed);
        return { step, refreshPage: true };
      }

      default:
        throw new Error("Hapi demo i panjohur.");
    }
  }
}
