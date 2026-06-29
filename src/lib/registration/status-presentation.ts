import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";

export type StatusTone = "action" | "waiting" | "done" | "danger" | "neutral";

export type StatusPresentation = {
  hint: string;
  badgeLabel: string;
  tone: StatusTone;
  accentClass: string;
  titleClass: string;
  badgeClass: string;
};

const ISHMT_ROLES = new Set<RoleCode>([
  ROLE_CODES.INSPECTOR,
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.SECTOR_HEAD,
  ROLE_CODES.SECTOR_SPECIALIST,
  ROLE_CODES.FIELD_INSPECTOR,
  ROLE_CODES.ADMIN,
]);

const REGISTERED_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.ELEVATOR_CREATED,
  ApplicationStatus.ASSETS_GENERATED,
  ApplicationStatus.CLOSED,
];

export function workflowStatusClass(tone: StatusTone): string {
  const map: Record<StatusTone, string> = {
    action: "workflow-status-action",
    waiting: "workflow-status-waiting",
    done: "workflow-status-done",
    danger: "workflow-status-danger",
    neutral: "workflow-status-outline",
  };
  return map[tone];
}

/** Etiketa e lexueshme e statusit; regjistrimet e miratuara shfaqen si "I regjistruar". */
export function getApplicationStatusLabel(status: ApplicationStatus, type?: ApplicationType): string {
  if (type === ApplicationType.NEW_REGISTRATION && REGISTERED_STATUSES.includes(status)) {
    return "I regjistruar";
  }
  return APPLICATION_STATUS_LABELS[status];
}

export function getApplicationStatusDisplay(
  status: ApplicationStatus,
  options?: { type?: ApplicationType; roleCode?: RoleCode },
): { label: string; tone: StatusTone } {
  const presentation = getOwnerStatusPresentation(status, options?.roleCode);
  return {
    label: getApplicationStatusLabel(status, options?.type),
    tone: presentation.tone,
  };
}

export function getApplicationStatusTone(status: ApplicationStatus, roleCode?: RoleCode): StatusTone {
  return getOwnerStatusPresentation(status, roleCode).tone;
}

const WAITING: StatusPresentation = {
  hint: "Aplikimi është në pritje të veprimit të palës së tretë. Nuk kërkohet ndërhyrja juaj në këtë fazë.",
  badgeLabel: "Në pritje",
  tone: "waiting",
  accentClass: "border-l-gov-warning bg-gov-warning/5",
  titleClass: "text-gov-warning",
  badgeClass: "bg-gov-warning/15 text-amber-900",
};

const ACTION: StatusPresentation = {
  hint: "Plotësoni fushat dhe vazhdoni me hapin tjetër.",
  badgeLabel: "Kërkon veprim",
  tone: "action",
  accentClass: "border-l-gov-primary bg-gov-primary/5",
  titleClass: "text-gov-primary",
  badgeClass: "bg-gov-primary/10 text-gov-primary",
};

const PROGRESS: StatusPresentation = {
  hint: "Procesi po vazhdon sipas radhës institucionale. Do të njoftoheni kur të jetë koha për hapin tjetër.",
  badgeLabel: "Në përpunim",
  tone: "neutral",
  accentClass: "border-l-gov-secondary bg-gov-secondary/5",
  titleClass: "text-gov-secondary",
  badgeClass: "bg-gov-secondary/10 text-gov-secondary",
};

const DONE: StatusPresentation = {
  hint: "Ky hap është përfunduar. Mund të vazhdoni me fazën tjetër të aplikimit.",
  badgeLabel: "E përfunduar",
  tone: "done",
  accentClass: "border-l-gov-success bg-gov-success/5",
  titleClass: "text-gov-success",
  badgeClass: "bg-gov-success/10 text-gov-success",
};

const CLOSED: StatusPresentation = {
  badgeLabel: "E mbyllur",
  hint: "Ky aplikim nuk është më aktiv në workflow.",
  tone: "neutral",
  accentClass: "border-l-muted-foreground bg-muted",
  titleClass: "text-muted-foreground",
  badgeClass: "bg-muted text-muted-foreground",
};

const BLOCKED: StatusPresentation = {
  badgeLabel: "Kërkon vëmendje",
  hint: "Rezultati i konformitetit nuk lejon parashtrimin. Kontaktoni certifikuesin ose ISHMT-në.",
  tone: "danger",
  accentClass: "border-l-gov-danger bg-gov-danger/5",
  titleClass: "text-gov-danger",
  badgeClass: "bg-gov-danger/10 text-gov-danger",
};

function getIshmtStatusPresentation(status: ApplicationStatus, roleCode: RoleCode): StatusPresentation | null {
  if (!ISHMT_ROLES.has(roleCode)) return null;

  switch (status) {
    case ApplicationStatus.SUBMITTED:
      return {
        ...ACTION,
        hint: "Aplikimi sapo u parashtrua dhe pret marrjen në shqyrtim.",
        badgeLabel: "E re në radhë",
      };
    case ApplicationStatus.UNDER_REVIEW:
      if (roleCode === ROLE_CODES.INSPECTOR || roleCode === ROLE_CODES.SECTOR_SPECIALIST) {
        return {
          ...ACTION,
          hint: "Dosja është në shqyrtim administrativ. Rekomandoni miratim, kthim ose refuzim.",
          badgeLabel: "Shqyrtoni",
        };
      }
      return {
        ...PROGRESS,
        hint: "Aplikimi është në shqyrtim nga specialisti/inspektori.",
        badgeLabel: "Në shqyrtim",
      };
    case ApplicationStatus.PENDING_CHIEF_INSPECTOR:
      if (roleCode === ROLE_CODES.CHIEF_INSPECTOR || roleCode === ROLE_CODES.ISHMT_DIRECTOR) {
        return {
          ...ACTION,
          hint: "Dosja pret vendimin final të miratimit ose refuzimit.",
          badgeLabel: "Prit miratim",
        };
      }
      return {
        ...WAITING,
        hint: "Shqyrtimi përfundoi. Dosja është në pritje të miratimit final.",
        badgeLabel: "Në pritje miratimi",
      };
    case ApplicationStatus.RETURNED:
      return {
        ...WAITING,
        hint: "Aplikimi u kthye për korrigjim te palë e caktuar.",
        badgeLabel: "E kthyer",
      };
    case ApplicationStatus.REJECTED:
      return { ...CLOSED, tone: "danger", badgeLabel: "E refuzuar" };
    case ApplicationStatus.APPROVED:
    case ApplicationStatus.ELEVATOR_CREATED:
    case ApplicationStatus.ASSETS_GENERATED:
    case ApplicationStatus.CLOSED:
      return {
        ...DONE,
        hint: "Aplikimi u miratua dhe regjistrimi u përfundua.",
        badgeLabel: "E miratuar",
      };
    case ApplicationStatus.CANCELLED:
    case ApplicationStatus.EXPIRED:
      return CLOSED;
    default:
      return null;
  }
}

export function getOwnerStatusPresentation(status: ApplicationStatus, roleCode?: RoleCode): StatusPresentation {
  const ishmt = roleCode ? getIshmtStatusPresentation(status, roleCode) : null;
  if (ishmt) return ishmt;

  if (roleCode === ROLE_CODES.INSTALLER) {
    if (status === ApplicationStatus.INSTALLER_INVITED || status === ApplicationStatus.PENDING_INSTALLER) {
      return { ...ACTION, hint: "Keni një ftesë për të pranuar para se të plotësoni të dhënat teknike." };
    }
    if (status === ApplicationStatus.INSTALLER_ACCEPTED || status === ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS) {
      return { ...ACTION, hint: "Plotësoni të dhënat teknike të ashensorit sipas fushës suaj të kompetencës." };
    }
    if (status === ApplicationStatus.TECHNICAL_DATA_COMPLETED || status === ApplicationStatus.INSTALLER_COMPLETED) {
      return {
        ...DONE,
        hint: "Pjesa juaj si instalues është përfunduar. Personi përgjegjës i ashensorit vazhdon procesin me certifikuesin.",
      };
    }
    if (status === ApplicationStatus.RETURNED) {
      return { ...ACTION, hint: "ISHMT kërkon korrigjim në të dhënat teknike. Plotësoni sërish seksionin tuaj." };
    }
    return {
      ...PROGRESS,
      hint: "Aplikimi është në proces. Pjesa juaj si instalues është përfunduar ose në pritje.",
    };
  }

  if (roleCode === ROLE_CODES.CERTIFIER) {
    if (status === ApplicationStatus.CERTIFIER_INVITED || status === ApplicationStatus.PENDING_CERTIFIER) {
      return { ...ACTION, hint: "Keni një ftesë OMI për të pranuar para se të plotësoni certifikimin." };
    }
    if (status === ApplicationStatus.CERTIFIER_ACCEPTED || status === ApplicationStatus.CERTIFICATION_IN_PROGRESS) {
      return { ...ACTION, hint: "Plotësoni të dhënat e certifikimit dhe konformitetit." };
    }
    if (
      status === ApplicationStatus.CERTIFICATION_COMPLETED ||
      status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES
    ) {
      if (status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES) {
        return {
          ...BLOCKED,
          hint: "Certifikimi u regjistrua me çështje. Personi përgjegjës i ashensorit duhet të kontaktojë ISHMT-në ose certifikuesin.",
        };
      }
      return {
        ...DONE,
        hint: "Pjesa juaj si certifikues është përfunduar. Personi përgjegjës i ashensorit vazhdon me rishikimin dhe parashtrimin.",
      };
    }
    if (status === ApplicationStatus.RETURNED) {
      return { ...ACTION, hint: "ISHMT kërkon korrigjim në certifikimin. Plotësoni sërish seksionin tuaj." };
    }
    return {
      ...PROGRESS,
      hint: "Aplikimi është në proces. Pjesa juaj si certifikues është përfunduar ose në pritje.",
    };
  }

  switch (status) {
    case ApplicationStatus.DRAFT:
    case ApplicationStatus.RETURNED:
      return ACTION;
    case ApplicationStatus.BASIC_DATA_COMPLETED:
      return { ...ACTION, hint: "Zgjidhni kompaninë instaluese të licencuar për të vazhduar." };
    case ApplicationStatus.PENDING_INSTALLER:
    case ApplicationStatus.INSTALLER_INVITED:
      return {
        ...WAITING,
        hint: "Ftesa u dërgua te kompania instaluese. Pritni që instaluesi të pranojë ftesën.",
      };
    case ApplicationStatus.INSTALLER_ACCEPTED:
    case ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS:
      return {
        ...WAITING,
        hint: "Instaluesi po plotëson të dhënat teknike. Do të mund të vazhdoni vetëm pas përfundimit nga instaluesi.",
      };
    case ApplicationStatus.TECHNICAL_DATA_COMPLETED:
    case ApplicationStatus.INSTALLER_COMPLETED:
      return {
        ...ACTION,
        hint: "Të dhënat teknike u plotësuan. Zgjidhni kompaninë OMI / certifikuese.",
      };
    case ApplicationStatus.PENDING_CERTIFIER:
    case ApplicationStatus.CERTIFIER_INVITED:
      return {
        ...WAITING,
        hint: "Ftesa u dërgua te certifikuesi. Pritni që OMI të pranojë ftesën.",
      };
    case ApplicationStatus.CERTIFIER_ACCEPTED:
    case ApplicationStatus.CERTIFICATION_IN_PROGRESS:
      return {
        ...WAITING,
        hint: "Certifikuesi po plotëson të dhënat e konformitetit. Do të mund të vazhdoni vetëm pas përfundimit.",
      };
    case ApplicationStatus.CERTIFICATION_COMPLETED:
    case ApplicationStatus.PENDING_OWNER_SUBMISSION:
      return {
        ...ACTION,
        hint: "Certifikimi u plotësua. Rishikoni dossier-in dhe parashtrojeni aplikimin tek ISHMT.",
      };
    case ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES:
      return BLOCKED;
    case ApplicationStatus.SUBMITTED:
    case ApplicationStatus.UNDER_REVIEW:
      return {
        ...PROGRESS,
        hint: "Aplikimi është parashtruar tek ISHMT dhe është në shqyrtim nga inspektori.",
      };
    case ApplicationStatus.PENDING_CHIEF_INSPECTOR:
      return {
        ...WAITING,
        hint: "Inspektori përfundoi shqyrtimin. Dosja është në pritje të miratimit final nga administratori ISHMT.",
      };
    case ApplicationStatus.APPROVED:
    case ApplicationStatus.ELEVATOR_CREATED:
    case ApplicationStatus.ASSETS_GENERATED:
    case ApplicationStatus.CLOSED:
      return {
        ...DONE,
        hint: "Regjistrimi u miratua. Ashensori dhe dokumentet zyrtare janë të disponueshme.",
      };
    case ApplicationStatus.REJECTED:
      return { ...CLOSED, tone: "danger", badgeLabel: "E refuzuar" };
    case ApplicationStatus.CANCELLED:
    case ApplicationStatus.EXPIRED:
      return CLOSED;
    default:
      return PROGRESS;
  }
}
