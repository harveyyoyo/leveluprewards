/**
 * Google accounts that always have developer + admin-passcode bypass access.
 * Keep in sync with `functions/src/googleAllowlist.ts`.
 */
export const GOOGLE_OWNER_EMAILS = ['sdeichemed@gmail.com'] as const;

export function isGoogleOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (GOOGLE_OWNER_EMAILS as readonly string[]).includes(normalized);
}

/**
 * Owners always pass. Otherwise the email must be explicitly on the allowlist.
 * An empty/unconfigured allowlist denies everyone (fail closed) — it must NOT
 * grant access to any Google account, since that would let anyone in the world
 * sign in as a developer or bypass a school's admin passcode if the allowlist
 * env var is ever missing or misconfigured.
 */
export function isAllowedGoogleEmailOnAllowlist(email: string, allowlist: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (isGoogleOwnerEmail(normalized)) return true;
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalized);
}
