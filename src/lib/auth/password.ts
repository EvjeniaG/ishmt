import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const MIN_LENGTH = 8;

const HAS_DIGIT = /\d/;
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;

export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Fjalëkalimi duhet të jetë të paktën ${MIN_LENGTH} karaktere i gjatë.`);
  }

  if (!HAS_DIGIT.test(password)) {
    errors.push("Fjalëkalimi duhet të përmbajë të paktën një numër.");
  }

  if (!HAS_UPPER.test(password) || !HAS_LOWER.test(password)) {
    errors.push("Fjalëkalimi duhet të përmbajë të paktën një gërmë kapitale dhe një jo-kapitale.");
  }

  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
