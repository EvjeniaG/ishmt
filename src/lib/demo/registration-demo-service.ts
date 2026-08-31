import { ApplicationStatus, ApplicationType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApplicationService } from "@/lib/services/application-service";
import { DocumentService } from "@/lib/services/document-service";
import {
  getApplicationDocumentSpecs,
  getRegistrationDocumentSpecsByPhase,
} from "@/lib/documents/application-document-checklist";
import { minimalDemoPdfBuffer } from "@/lib/demo/minimal-pdf";
import {
  isDemoToolsEnabled,
  type RegistrationDemoStep,
} from "@/lib/demo/registration-demo-steps";
import { buildNormalizedRegistrationExtended } from "@/lib/registration/anneks-codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { resolveDemoCertifierOrganization, resolveDemoInstallerOrganization } from "@/lib/demo/demo-seed-orgs";
import type { AuthContext } from "@/lib/permissions/guards";

function demoSerial(): string {
  return `DEMO-${Date.now().toString(36).toUpperCase()}`;
}

export type RegistrationDemoFillResult = {
  step: RegistrationDemoStep;
  /** Kur true, klienti duhet të rifreskojë faqen që formularët të marrin vlerat e reja. */
  refreshPage?: boolean;
  /** Zgjedh automatikisht organizatën në dropdown (pa e caktuar ende). */
  prefilledOrgField?: "installerOrgId" | "certifierOrgId";
  prefilledOrgId?: string;
  /** Emri ose NIPT për formën e kërkimit të instaluesit. */
  prefilledOrgQuery?: string;
};

export class RegistrationDemoService {
  static assertEnabled() {
    if (!isDemoToolsEnabled()) {
      throw new Error("Mjetet demo janë të çaktivizuara në production.");
    }
  }

  static async uploadMissingPurposes(
    ctx: AuthContext,
    applicationId: string,
    type: ApplicationType,
    purposes: string[],
    data?: Parameters<typeof getApplicationDocumentSpecs>[0]["data"],
  ) {
    const uploaded = new Set(await DocumentService.listPurposesForEntity("application", applicationId));
    const specs = getApplicationDocumentSpecs({ type, data });
    const pdf = minimalDemoPdfBuffer();

    for (const purpose of purposes) {
      if (uploaded.has(purpose)) continue;
      const spec = specs.find((s) => s.purpose === purpose);
      if (!spec) continue;
      await DocumentService.uploadAndLink(ctx, {
        buffer: pdf,
        originalFilename: `demo-${purpose.toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        classification: spec.classification,
        entityType: "application",
        entityId: applicationId,
        purpose,
      });
      uploaded.add(purpose);
    }
  }

  /** Plotëson fushat dhe dokumentet demo - pa kaluar automatikisht në hapin tjetër. */
  static async fillStepFields(
    ctx: AuthContext,
    applicationId: string,
    step: RegistrationDemoStep,
  ): Promise<RegistrationDemoFillResult> {
    this.assertEnabled();

    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true, ownerOrg: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (application.type !== ApplicationType.NEW_REGISTRATION) {
      throw new Error("Demo mbështetet vetëm për regjistrim të ri.");
    }

    const municipality =
      (await db.geoMunicipality.findFirst({ orderBy: { nameSq: "asc" } })) ??
      (application.data?.municipalityId
        ? await db.geoMunicipality.findUnique({ where: { id: application.data.municipalityId } })
        : null);
    if (!municipality) throw new Error("Nuk u gjet asnjë bashki - ekzekutoni seed-in.");

    const owner = application.ownerOrg;
    const today = new Date();
    const certDate = new Date("2018-07-15");
    const examDate = new Date("2019-03-10");

    switch (step) {
      case "owner-basic-data": {
        if (ctx.roleCode !== ROLE_CODES.OWNER) {
          throw new Error("Vetëm personi përgjegjës i ashensorit mund të plotësojë të dhënat bazë demo.");
        }
        const allowed: ApplicationStatus[] = [
          ApplicationStatus.DRAFT,
          ApplicationStatus.PENDING_OWNER_SUBMISSION,
          ApplicationStatus.RETURNED,
        ];
        if (!allowed.includes(application.status)) {
          throw new Error(`Të dhënat bazë demo nuk mund të plotësohen në statusin '${application.status}'.`);
        }

        await db.applicationData.update({
          where: { applicationId },
          data: {
            buildingName: "Godina Demo IQMT",
            buildingAddress: "Rruga e Dibrës Nr. 15, Tiranë",
            municipalityId: municipality.id,
            legacyDistrictCode: municipality.legacyRegistryCode ?? municipality.code.slice(0, 2).toUpperCase(),
            entrance: "A",
            floorLocation: "Kati 0",
            buildingType: "CO_OWNERSHIP_BUILDING" as Prisma.ApplicationDataUpdateInput["buildingType"],
            usagePurpose: "ELECTRIC_PASSENGER" as Prisma.ApplicationDataUpdateInput["usagePurpose"],
            responsibleEntityName: owner.name,
            responsibleEntityIdentifier: owner.nipt ?? "L12345678A",
            responsibleEntityEmail: owner.email ?? "demo.owner@ishmt.local",
            responsibleEntityPhone: owner.phone ?? "+355692000000",
            notes: "Të dhëna demo - plotësim i shpejtë i fushave.",
            registrationExtendedData: buildNormalizedRegistrationExtended(
              {},
              {
                buildingType: "CO_OWNERSHIP_BUILDING",
                usagePurpose: "ELECTRIC_PASSENGER",
              },
            ) as Prisma.InputJsonValue,
          },
        });
        await this.uploadMissingPurposes(ctx, applicationId, ApplicationType.NEW_REGISTRATION, [
          "LAYOUT_PLAN",
        ]);
        return { step, refreshPage: true };
      }

      case "owner-assign-installer": {
        if (ctx.roleCode !== ROLE_CODES.OWNER) {
          throw new Error("Vetëm personi përgjegjës i ashensorit mund të zgjedhë instaluesin demo.");
        }
        const installer = await resolveDemoInstallerOrganization();
        if (!installer) {
          throw new Error(
            "Nuk u gjet kompani instaluese demo - ekzekutoni seed-demo (Ashensorë Pro, Lift Master ose Euro Ashensorë).",
          );
        }
        return {
          step,
          prefilledOrgField: "installerOrgId",
          prefilledOrgId: installer.id,
          prefilledOrgQuery: installer.nipt ?? installer.name,
        };
      }

      case "installer-technical": {
        const serial = demoSerial();
        await ApplicationService.updateTechnicalData(ctx, applicationId, {
          elevatorType: "PASSENGER",
          manufacturer: "KONE",
          model: "MonoSpace 500",
          serialNumber: serial,
          manufacturingYear: 2018,
          capacityKg: 630,
          capacityPersons: 8,
          speedMs: 1,
          floorsServed: 6,
          stops: 6,
          driveType: "ELECTRIC",
        });
        await db.applicationData.update({
          where: { applicationId },
          data: {
            additionalTechnical: {
              installationDate: "2018-06-01",
              commissioningDate: "2018-07-15",
              elevatorDriveType: "ME_KAVO_TERHEQESE_KONVENCIONALE",
            },
          },
        });
        const refreshed = await db.applicationData.findUnique({ where: { applicationId } });
        const installerPurposes = getRegistrationDocumentSpecsByPhase("installer", refreshed).map(
          (s) => s.purpose,
        );
        await this.uploadMissingPurposes(
          ctx,
          applicationId,
          ApplicationType.NEW_REGISTRATION,
          installerPurposes,
          refreshed,
        );
        return { step, refreshPage: true };
      }

      case "owner-assign-certifier": {
        if (ctx.roleCode !== ROLE_CODES.OWNER) {
          throw new Error("Vetëm personi përgjegjës i ashensorit mund të zgjedhë certifikuesin demo.");
        }
        const certifier = await resolveDemoCertifierOrganization();
        if (!certifier) {
          throw new Error(
            "Nuk u gjet kompani certifikuese demo - ekzekutoni seed-demo (OM Certifikim, Inspekt OM ose Quality Lift).",
          );
        }
        return {
          step,
          prefilledOrgField: "certifierOrgId",
          prefilledOrgId: certifier.id,
        };
      }

      case "certifier-certification": {
        const dataBefore = await db.applicationData.findUnique({ where: { applicationId } });
        await this.uploadMissingPurposes(
          ctx,
          applicationId,
          ApplicationType.NEW_REGISTRATION,
          ["INITIAL_INSPECTION_CERT"],
          dataBefore,
        );
        await ApplicationService.updateCertificationData(ctx, applicationId, {
          installationCertificateNumber: `DEMO-CERT-${today.getFullYear()}`,
          installationCertificateDate: certDate,
          certifierNotes: "Certifikim demo për testim.",
          omiNumber: "OM-DEMO-001",
          examinationType: "EKZAMINIM_I_PLOTE",
          examinationDate: examDate,
          conformityResult: "CONFORM",
          certificateReference: `REF-DEMO-${today.getFullYear()}`,
          certifierTechnicalNotes: "Ashensor ekzistues - raport demo OM.",
        });
        return { step, refreshPage: true };
      }

      case "owner-pre-submit": {
        if (ctx.roleCode !== ROLE_CODES.OWNER) {
          throw new Error("Vetëm personi përgjegjës i ashensorit mund të plotësojë dosjen para parashtrimit demo.");
        }
        const allowed: ApplicationStatus[] = [
          ApplicationStatus.CERTIFICATION_COMPLETED,
          ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES,
          ApplicationStatus.PENDING_OWNER_SUBMISSION,
        ];
        if (!allowed.includes(application.status)) {
          throw new Error(`Dosja demo para parashtrimit nuk mund të plotësohet në statusin '${application.status}'.`);
        }

        const existingExt =
          (application.data?.registrationExtendedData as Record<string, unknown> | null) ?? {};
        const existingTechnical =
          (application.data?.additionalTechnical as Record<string, unknown> | null) ?? {};
        const legacyCode =
          municipality.legacyRegistryCode ?? municipality.code.slice(0, 2).toUpperCase();
        const normalizedExtended = buildNormalizedRegistrationExtended(existingExt, {
          buildingType: application.data?.buildingType,
          usagePurpose: application.data?.usagePurpose,
        });

        await db.applicationData.update({
          where: { applicationId },
          data: {
            applicationDate: application.data?.applicationDate ?? today,
            legacyDistrictCode: application.data?.legacyDistrictCode ?? legacyCode,
            responsibleEntityIdentifier:
              application.data?.responsibleEntityIdentifier ?? owner.nipt ?? "L12345678A",
            registrationExtendedData: {
              ...normalizedExtended,
              elevatorInServiceDate:
                normalizedExtended.elevatorInServiceDate ??
                existingTechnical.installationDate ??
                existingTechnical.commissioningDate ??
                "2018-06-01",
            } as Prisma.InputJsonValue,
          },
        });

        const refreshed = await db.applicationData.findUnique({ where: { applicationId } });
        const ownerPurposes = getRegistrationDocumentSpecsByPhase("owner", refreshed).map(
          (s) => s.purpose,
        );
        await this.uploadMissingPurposes(
          ctx,
          applicationId,
          ApplicationType.NEW_REGISTRATION,
          ownerPurposes,
          refreshed,
        );

        return { step, refreshPage: true };
      }

      default:
        throw new Error("Hapi demo i panjohur.");
    }
  }
}
