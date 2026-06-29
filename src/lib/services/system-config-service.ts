import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import { AuditAction } from "@prisma/client";

export type ComplianceRulesConfig = {
  inspectionWarningDays: number;
  certificateWarningDays: number;
  maintenanceReportMaxDays: number;
  inspectionIntervalMonthsDefault: number;
  inspectionIntervalMonthsWorkplace: number;
};

export const DEFAULT_COMPLIANCE_RULES: ComplianceRulesConfig = {
  inspectionWarningDays: 30,
  certificateWarningDays: 30,
  maintenanceReportMaxDays: 30,
  inspectionIntervalMonthsDefault: 12,
  inspectionIntervalMonthsWorkplace: 6,
};

export class SystemConfigService {
  static async getAll() {
    return db.systemConfig.findMany({ orderBy: { key: "asc" } });
  }

  static async get<T = unknown>(key: string): Promise<T | null> {
    const row = await db.systemConfig.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
  }

  static async getComplianceRules(): Promise<ComplianceRulesConfig> {
    const value = await this.get<Partial<ComplianceRulesConfig>>("compliance_rules");
    return { ...DEFAULT_COMPLIANCE_RULES, ...value };
  }

  static async update(key: string, value: unknown, actorId: string, description?: string) {
    const before = await db.systemConfig.findUnique({ where: { key } });

    const updated = await db.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: value as object,
        description: description ?? null,
        updatedById: actorId,
      },
      update: {
        value: value as object,
        ...(description !== undefined ? { description } : {}),
        updatedById: actorId,
      },
    });

    await AuditService.log({
      actorId,
      action: AuditAction.UPDATE,
      entityType: "system_config",
      entityId: key,
      beforeState: before ? { value: before.value } : null,
      afterState: { value: updated.value },
    });

    return updated;
  }
}
