"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/guards";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";
import { seedServiceProviderPortalDemo } from "../../../prisma/lib/seed-service-provider-portal-demo";
import { isMultiCapabilityProvider } from "@/lib/organizations/org-capabilities";

export async function seedServiceProviderPortalDemoAction() {
  if (!isDemoToolsEnabled()) {
    return { ok: false as const, error: "Mjetet demo nuk janë të aktivizuara." };
  }

  const ctx = await requireAuth();
  if (!isMultiCapabilityProvider(ctx.orgCapabilities)) {
    return { ok: false as const, error: "Vetëm kompanitë me më shumë funksione mund të përdorin këtë demo." };
  }

  try {
    const result = await seedServiceProviderPortalDemo(db);
    revalidatePath("/portal/dashboard");
    revalidatePath("/portal/applications");
    revalidatePath("/portal/elevators");
    revalidatePath("/portal/sherbimi/contracts");
    revalidatePath("/portal/sherbimi/nderhyrje");
    revalidatePath("/portal/sherbimi/raport-mujor");
    revalidatePath("/portal/omi/kontratat-kontrolli");
    revalidatePath("/portal/omi/inspektim-periodik");
    return {
      ok: true as const,
      elevatorCount: result.elevatorCount,
      applicationCount: result.applicationCount,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Demo nuk u krijua.",
    };
  }
}
