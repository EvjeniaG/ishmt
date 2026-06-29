"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/guards";
import { NotificationService } from "@/lib/services/notification-service";

export async function markAllNotificationsReadAction() {
  try {
    const ctx = await requireAuth();
    await NotificationService.markAllUnreadRead(ctx.userId);
    revalidatePath("/portal/notifications");
    revalidatePath("/ishmt/notifications");
    revalidatePath("/portal/dashboard");
    revalidatePath("/ishmt/dashboard");
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Veprimi dështoi";
    return { success: false as const, error: message };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const ctx = await requireAuth();
    await NotificationService.markRead(ctx.userId, notificationId);
    revalidatePath("/portal/notifications");
    revalidatePath("/ishmt/notifications");
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Veprimi dështoi";
    return { success: false as const, error: message };
  }
}
