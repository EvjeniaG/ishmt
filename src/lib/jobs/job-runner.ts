import {
  ASSET_GENERATION_JOB_TYPE,
  executeAssetGenerationRetryJobWithLogging,
} from "@/lib/jobs/asset-generation-job";
import { executeLicenseExpiryJobWithLogging, LICENSE_EXPIRY_JOB_TYPE } from "@/lib/jobs/license-expiry-job";
import { ComplianceService } from "@/lib/services/compliance-service";
import { InvitationService } from "@/lib/services/invitation-service";
import { OwnerDashboardService } from "@/lib/services/owner-dashboard-service";
import { ReminderSchedulerService } from "@/lib/services/reminder-scheduler-service";

export const CRON_JOB_TYPES = [
  ASSET_GENERATION_JOB_TYPE,
  LICENSE_EXPIRY_JOB_TYPE,
  "INVITATION_EXPIRY",
  "COMPLIANCE_RECALC",
  "REMINDERS",
  "OWNER_COMPLIANCE_NOTIFICATIONS",
] as const;

export type CronJobType = (typeof CRON_JOB_TYPES)[number];

export async function runScheduledJobs(jobTypes?: string[]) {
  const results: Record<string, unknown> = {};

  const shouldRun = (type: string) => !jobTypes || jobTypes.includes(type);

  if (shouldRun(ASSET_GENERATION_JOB_TYPE)) {
    results[ASSET_GENERATION_JOB_TYPE] = await executeAssetGenerationRetryJobWithLogging();
  }

  if (shouldRun(LICENSE_EXPIRY_JOB_TYPE)) {
    results[LICENSE_EXPIRY_JOB_TYPE] = await executeLicenseExpiryJobWithLogging();
  }

  if (shouldRun("INVITATION_EXPIRY")) {
    results.INVITATION_EXPIRY = {
      expiredCount: await InvitationService.expireStaleInvitations(),
    };
  }

  if (shouldRun("COMPLIANCE_RECALC")) {
    results.COMPLIANCE_RECALC = await ComplianceService.recalculateAll();
  }

  if (shouldRun("REMINDERS")) {
    const scheduled = await ReminderSchedulerService.scheduleUpcomingDeadlines();
    const sent = await ReminderSchedulerService.runDueReminders();
    results.REMINDERS = { scheduled, sent };
  }

  if (shouldRun("OWNER_COMPLIANCE_NOTIFICATIONS")) {
    results.OWNER_COMPLIANCE_NOTIFICATIONS =
      await OwnerDashboardService.syncAllComplianceNotifications();
  }

  return results;
}
