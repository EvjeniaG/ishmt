import { db } from "@/lib/db";

/** Të dhëna kontakti të njohura nga llogaria e përdoruesit - plotësohen automatikisht në forma. */
export type UserContactPrefill = {
  firstName: string;
  lastName: string;
  fullName: string;
  fatherName?: string;
  email: string;
  phone?: string;
  nid?: string;
  birthDate?: string;
};

export type ReporterContactPrefill = Pick<
  UserContactPrefill,
  "firstName" | "lastName" | "email" | "phone"
>;

type UserContactSource = {
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  email: string;
  phone?: string | null;
  nid?: string | null;
  birthDate?: Date | string | null;
};

export function buildUserContactPrefill(user: UserContactSource): UserContactPrefill {
  const firstName = user.firstName.trim();
  const lastName = user.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const birthDate =
    user.birthDate instanceof Date
      ? user.birthDate.toISOString().slice(0, 10)
      : user.birthDate
        ? String(user.birthDate).slice(0, 10)
        : undefined;

  return {
    firstName,
    lastName,
    fullName,
    fatherName: user.fatherName?.trim() || undefined,
    email: user.email.trim(),
    phone: user.phone?.trim() || undefined,
    nid: user.nid?.trim().toUpperCase() || undefined,
    birthDate,
  };
}

export function buildTechnicianDisplayName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function buildReporterContactPrefill(user: UserContactPrefill): ReporterContactPrefill {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
  };
}

export async function loadUserContactPrefill(userId: string): Promise<UserContactPrefill | null> {
  const user = await db.authUser.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      fatherName: true,
      email: true,
      phone: true,
      nid: true,
      birthDate: true,
    },
  });

  if (!user) return null;
  return buildUserContactPrefill(user);
}

/** Emri i teknikut / operatorit - nga llogaria e përdoruesit të kyçur. */
export async function loadTechnicianNamePrefill(userId: string): Promise<string | undefined> {
  const contact = await loadUserContactPrefill(userId);
  return contact?.fullName || undefined;
}
