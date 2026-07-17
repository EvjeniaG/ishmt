import { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_CODES } from "@/lib/constants/roles";
import { NotificationService } from "@/lib/services/notification-service";

export async function notifyChiefInspectors(
  input: { title: string; body: string; entityType?: string; entityId?: string },
) {
  const ishmtOrg = await db.organization.findFirst({
    where: { type: OrgType.ISHMT, deletedAt: null },
    select: { id: true },
  });
  if (!ishmtOrg) return;

  const chiefs = await db.orgMembership.findMany({
    where: {
      organizationId: ishmtOrg.id,
      deactivatedAt: null,
      role: { code: ROLE_CODES.CHIEF_INSPECTOR },
    },
    select: { userId: true },
  });

  await Promise.all(
    chiefs.map((m) =>
      NotificationService.create({
        userId: m.userId,
        title: input.title,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
      }),
    ),
  );
}

export async function notifyUser(
  userId: string,
  input: { title: string; body: string; entityType?: string; entityId?: string },
) {
  await NotificationService.create({
    userId,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
  });
}

export const ISHMT_NOTIFICATION_COPY = {
  submittedToChief: {
    title: "Aplikim i ri për Registrim",
    body: (applicationNumber: string) =>
      `Është dorëzuar një Aplikim i ri për Regjistrim (${applicationNumber}). Aplikimi është në pritje të delegimit tuaj.`,
  },
  chiefToDirector: {
    title: "Aplikim për Regjistrim — delegim",
    body: (applicationNumber: string) =>
      `Kryeinspektori ju ka deleguar një Aplikim për Regjistrim (${applicationNumber}). Aplikimi është në pritje të shqyrtimit dhe delegimit tuaj.`,
  },
  directorToSectorHead: {
    title: "Aplikim për Regjistrim — delegim",
    body: (applicationNumber: string) =>
      `Drejtori i Drejtorisë ju ka deleguar një Aplikim për Regjistrim (${applicationNumber}). Aplikimi është në pritje të delegimit te inspektorët.`,
  },
  sectorHeadToInspectors: {
    title: "Aplikim për Regjistrim — shqyrtim",
    body: (applicationNumber: string) =>
      `Ju është deleguar një Aplikim për Regjistrim (${applicationNumber}) për shqyrtim. Ju lutemi shqyrtoni dosjen dhe plotësoni raportin tuaj.`,
  },
  inspectorsToSectorHead: {
    title: "Raportet e inspektorëve u përfunduan",
    body: (applicationNumber: string) =>
      `Inspektorët kanë përfunduar shqyrtimin e Aplikimit për Regjistrim (${applicationNumber}). Dosja ju është deleguar për raportimin tuaj.`,
  },
  sectorHeadToDirector: {
    title: "Raporti i Përgjegjësit u përfundua",
    body: (applicationNumber: string) =>
      `Përgjegjësi ka përfunduar shqyrtimin dhe raportin e tij për ${applicationNumber}. Aplikimi ju është deleguar për vlerësimin tuaj.`,
  },
  directorToChief: {
    title: "Vlerësimi i Drejtorit u përfundua",
    body: (applicationNumber: string) =>
      `Drejtori i Drejtorisë ka përfunduar vlerësimin e Aplikimit për Regjistrim (${applicationNumber}). Dosja ju është deleguar për vendim përfundimtar.`,
  },
} as const;
