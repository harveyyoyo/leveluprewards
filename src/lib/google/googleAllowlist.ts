/**
 * Google accounts that always have developer + admin-passcode bypass access.
 * Keep in sync with `functions/src/googleAllowlist.ts`.
 */
export const GOOGLE_OWNER_EMAILS = ['sdeichemed@gmail.com'] as const;

export function isGoogleOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (GOOGLE_OWNER_EMAILS as readonly string[]).includes(normalized);
}

/** Owners always pass; otherwise the email must be explicitly present in the env allowlist. An empty/unset allowlist allows nobody but owners - it must never be treated as "allow all". */
export function isAllowedGoogleEmailOnAllowlist(email: string, allowlist: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (isGoogleOwnerEmail(normalized)) return true;
  return allowlist.includes(normalized);
}
