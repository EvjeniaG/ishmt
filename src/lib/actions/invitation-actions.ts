"use server";

import { getAuthSession } from "@/lib/auth";
import { InvitationService } from "@/lib/services/invitation-service";
import { validatePassword } from "@/lib/auth/password";

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { success: false as const, error: "Token i munguar." };
  }

  const session = await getAuthSession();
  const passwordCheck = validatePassword(password);

  try {
    if (session?.user?.id) {
      await InvitationService.acceptInvitation({
        rawToken: token,
        userId: session.user.id,
      });
    } else {
      if (!passwordCheck.valid) {
        return { success: false as const, error: passwordCheck.errors.join(" ") };
      }

      await InvitationService.acceptInvitation({
        rawToken: token,
        password,
      });
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Pranimi i ftesës dështoi",
    };
  }
}
