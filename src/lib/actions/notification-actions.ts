"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/guards";
import { NotificationService } from "@/lib/services/notification-service";

function revalidateNotificationSurfaces() {
  revalidatePath("/portal", "layout");
  revalidatePath("/ishmt", "layout");
  revalidatePath("/directorate", "layout");
}

export async function markAllNotificationsReadAction() {
  try {
    const ctx = await requireAuth();
    await NotificationService.markAllUnreadRead(ctx.userId);
    revalidateNotificationSurfaces();
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
    revalidateNotificationSurfaces();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Veprimi dështoi";
    return { success: false as const, error: message };
  }
}

export async function markNotificationsReadForPathAction(pathname: string) {
  try {
    const ctx = await requireAuth();
    const result = await NotificationService.markReadForMatchingPath(
      ctx.userId,
      pathname,
      ctx.roleCode,
    );
    if (result.marked > 0) {
      revalidateNotificationSurfaces();
    }
    return { success: true as const, marked: result.marked };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Veprimi dështoi";
    return { success: false as const, error: message };
  }
}
