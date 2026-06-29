import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";

export async function requireDirectoratePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.DIRECTORATE) redirect("/unauthorized");
  return session;
}

export async function requireDirectorateOrAdminReadonly() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  const ok =
    session.user.roleCode === ROLE_CODES.DIRECTORATE ||
    session.user.roleCode === ROLE_CODES.ADMIN;
  if (!ok) redirect("/unauthorized");
  return { session, readOnly: session.user.roleCode === ROLE_CODES.ADMIN };
}
