"use client";

import { ApplicationType, DataUpdateType } from "@prisma/client";
import { DemoStepFillButton } from "@/components/demo/demo-step-fill-button";
import {
  resolveApplicationDemoStep,
  type ApplicationDemoStep,
} from "@/lib/demo/application-demo-steps";
import { resolveRegistrationDemoStep } from "@/lib/demo/registration-demo-steps";
import type { ApplicationStatus } from "@prisma/client";
import type { RoleCode } from "@/lib/constants/roles";
import type { RegistrationPhase } from "@/lib/registration/phase-router";

export function ApplicationDemoButton({
  applicationId,
  type,
  status,
  roleCode,
  phase,
  updateType,
  hasModernization,
  hasInstaller,
  hasCertifier,
  hasChanges,
  hasUpdateType,
  hasReason,
  canInviteRecipient,
  ownershipAccepted,
  onlyStep,
  className = "mb-4",
}: {
  applicationId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  roleCode?: RoleCode;
  phase?: RegistrationPhase | null;
  updateType?: string | null;
  hasModernization?: boolean;
  hasInstaller?: boolean;
  hasCertifier?: boolean;
  hasChanges?: boolean;
  hasUpdateType?: boolean;
  hasReason?: boolean;
  canInviteRecipient?: boolean;
  ownershipAccepted?: boolean;
  /** Shfaq vetëm kur hapi aktual demo përputhet (p.sh. dokumentet). */
  onlyStep?: ApplicationDemoStep;
  className?: string;
}) {
  let step: ApplicationDemoStep | null = null;

  if (type === ApplicationType.NEW_REGISTRATION && phase) {
    step = resolveRegistrationDemoStep({ type, status, roleCode: roleCode!, phase });
  } else {
    step = resolveApplicationDemoStep({
      type,
      updateType,
      hasModernization,
      hasInstaller,
      hasCertifier,
      hasChanges,
      hasUpdateType,
      hasReason,
      canInviteRecipient,
      ownershipAccepted,
    });
  }

  if (!step) return null;
  if (onlyStep && step !== onlyStep) return null;
  return <DemoStepFillButton applicationId={applicationId} step={step} className={className} />;
}
