import { ApplicationStatus } from "@prisma/client";
import { currentPhaseLabel } from "@/lib/services/application-participation";

export type IshmtTrackerStepState = "completed" | "current" | "upcoming";

export type IshmtTrackerStep = {
  id: string;
  label: string;
  description: string;
  state: IshmtTrackerStepState;
};

const ISHMT_REVIEW_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.PENDING_DIRECTOR,
  ApplicationStatus.PENDING_SECTOR_HEAD,
  ApplicationStatus.PENDING_FIELD_REVIEW,
  ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
  ApplicationStatus.PENDING_DIRECTOR_REPORT,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
  ApplicationStatus.RETURNED_TO_INSPECTORS,
  ApplicationStatus.RETURNED_TO_SECTOR_HEAD,
  ApplicationStatus.RETURNED_TO_DIRECTOR,
  ApplicationStatus.UNDER_REVIEW,
];

const STEPS: {
  id: string;
  label: string;
  description: string;
  statuses: ApplicationStatus[];
}[] = [
  {
    id: "chief-intake",
    label: "Kryeinspektori",
    description: "Marrja e aplikimit dhe delegimi i parë",
    statuses: [ApplicationStatus.SUBMITTED],
  },
  {
    id: "director",
    label: "Drejtor i Drejtorisë",
    description: "Shqyrtim administrativ dhe delegim te përgjegjësi",
    statuses: [ApplicationStatus.PENDING_DIRECTOR, ApplicationStatus.RETURNED_TO_DIRECTOR],
  },
  {
    id: "sector-head",
    label: "Përgjegjësi i sektorit",
    description: "Caktimi i inspektorëve për shqyrtimin e dosjes",
    statuses: [ApplicationStatus.PENDING_SECTOR_HEAD, ApplicationStatus.RETURNED_TO_SECTOR_HEAD],
  },
  {
    id: "inspectors",
    label: "Inspektorët",
    description: "Shqyrtim i dokumentacionit dhe verifikim në terren (nëse kërkohet)",
    statuses: [ApplicationStatus.PENDING_FIELD_REVIEW, ApplicationStatus.RETURNED_TO_INSPECTORS],
  },
  {
    id: "sector-report",
    label: "Raporti i përgjegjësit",
    description: "Përmbledhje e shqyrtimit nga inspektorët",
    statuses: [ApplicationStatus.PENDING_SECTOR_HEAD_REPORT],
  },
  {
    id: "director-report",
    label: "Raporti i drejtorit",
    description: "Përmbledhje para dërgimit te kryeinspektori",
    statuses: [ApplicationStatus.PENDING_DIRECTOR_REPORT],
  },
  {
    id: "chief-decision",
    label: "Vendimi final",
    description: "Miratim, refuzim ose kthim për korrigjim",
    statuses: [ApplicationStatus.PENDING_CHIEF_INSPECTOR],
  },
];

export function isIshmtOwnerTrackingStatus(status: ApplicationStatus): boolean {
  return ISHMT_REVIEW_STATUSES.includes(status);
}

export function buildOwnerIshmtTrackerSteps(status: ApplicationStatus): IshmtTrackerStep[] {
  if (!isIshmtOwnerTrackingStatus(status)) return [];

  const currentIndex = STEPS.findIndex((step) => step.statuses.includes(status));
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;

  return STEPS.map((step, index) => ({
    id: step.id,
    label: step.label,
    description: step.description,
    state:
      index < resolvedIndex ? "completed" : index === resolvedIndex ? "current" : "upcoming",
  }));
}

export function getOwnerIshmtLocationLabel(status: ApplicationStatus): string {
  if (!isIshmtOwnerTrackingStatus(status)) return "";
  return currentPhaseLabel(status);
}
