import { generateSecret, generateURI, verifySync } from "otplib";

const ISSUER = "IQMT Regjistri Ashensorësh";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpAuthUrl(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = verifySync({ token: normalized, secret });
  return result.valid === true;
}
