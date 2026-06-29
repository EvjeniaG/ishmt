/**
 * One-off demo: fill registration basic data for an owner account.
 * Usage: npx tsx scripts/demo-fill-basic-data.ts [email]
 */
import { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_CODES } from "@/lib/constants/roles";
import { ROLE_PERMISSION_MATRIX } from "@/lib/permissions/matrix";
import type { AuthContext } from "@/lib/permissions/guards";
import { ApplicationService } from "@/lib/services/application-service";
import { RegistrationService } from "@/lib/services/registration-service";

const EMAIL = process.argv[2] ?? "evjeniagjici@gmail.com";

async function main() {
  const user = await db.authUser.findFirst({
    where: { email: EMAIL, deletedAt: null },
    include: {
      memberships: {
        where: { organization: { type: "OWNER", deletedAt: null } },
        include: { organization: true, role: true },
      },
    },
  });

  if (!user) {
    throw new Error(`Përdoruesi ${EMAIL} nuk u gjet.`);
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new Error(`Përdoruesi ${EMAIL} nuk ka organizatë OWNER.`);
  }

  const municipality = await db.geoMunicipality.findFirst({
    where: { isActive: true, nameSq: { contains: "Tiran", mode: "insensitive" } },
  });
  if (!municipality) {
    throw new Error("Bashkia Tiranë nuk u gjet.");
  }

  const ctx: AuthContext = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    activeOrgId: membership.organizationId,
    activeOrgType: membership.organization.type,
    activeOrgName: membership.organization.name,
    roleCode: ROLE_CODES.OWNER,
    permissions: ROLE_PERMISSION_MATRIX[ROLE_CODES.OWNER],
  };

  let application = await db.application.findFirst({
    where: {
      ownerOrgId: membership.organizationId,
      type: "NEW_REGISTRATION",
      status: ApplicationStatus.DRAFT,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!application) {
    application = await ApplicationService.createDraft(ctx);
    console.log("Krijuar aplikim i ri:", application.applicationNumber);
  } else {
    console.log("Përdorur aplikim ekzistues:", application.applicationNumber);
  }

  const today = new Date().toISOString().slice(0, 10);

  await RegistrationService.updateBasicData(ctx, application.id, {
    applicationDate: today,
    elevatorConditionType: "NEW",
    applicationSubtype: "FIRST",
    responsibleEntityType: "PHYSICAL_PERSON",
    responsibleEntityName: `${user.firstName} ${user.lastName}`,
    responsibleIdentifierType: "NID",
    responsibleIdentifier: "J12345678A",
    responsibleAddress: "Rr. Myslym Shyri, Nr. 15, Tiranë",
    responsiblePhone: "+355 69 123 4567",
    responsibleEmail: user.email,
    representedBy: `${user.firstName} ${user.lastName}`,
    representativePosition: "Personi përgjegjës",
    buildingName: 'Pallati "Dritan"',
    buildingAddress: "Rr. Myslym Shyri, Pallati Dritan, Tiranë 1001",
    municipalityId: municipality.id,
    administrativeUnitId: "",
    entrance: "A",
    specificPosition: "Ashensori nr. 1 - kati -1 deri kati 8",
    registrationBuildingType: "NDERTESA_NE_BASHKEPRONESI",
    buildingMainUse: "Banim / godinë me banesa",
    usagePurposeCode: "TRANSPORT_NJEREZISH_ELEKTRIK",
    ownerNotes: "Aplikim demo - testim i workflow-it të regjistrimit.",
    saveAsDraft: "false",
  });

  const updated = await db.application.findUnique({
    where: { id: application.id },
    select: { id: true, applicationNumber: true, status: true },
  });

  console.log("\n✓ Demo u plotësua me sukses");
  console.log("  Email:      ", EMAIL);
  console.log("  Aplikimi:   ", updated?.applicationNumber);
  console.log("  Status:     ", updated?.status);
  console.log("  URL:        ", `http://localhost:3000/portal/applications/${application.id}/select-installer`);
}

main()
  .catch((err) => {
    console.error("Gabim:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
