/**
 * Google accounts that always have developer + admin-passcode bypass access.
 * Keep in sync with `functions/src/googleAllowlist.ts`.
 */
export const GOOGLE_OWNER_EMAILS = ['sdeichemed@gmail.com'] as const;

export function isGoogleOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (GOOGLE_OWNER_EMAILS as readonly string[]).includes(normalized);
}

/** Env allowlist when set; owners always pass; empty env allowlist allows any Google account. */
export function isAllowedGoogleEmailOnAllowlist(email: string, allowlist: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (isGoogleOwnerEmail(normalized)) return true;
  if (allowlist.length === 0) return true;
  return allowlist.includes(normalized);
}
