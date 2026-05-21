/**
 * Keep in sync with `src/lib/googleAllowlist.ts`.
 */
export const GOOGLE_OWNER_EMAILS = ["sdeichemed@gmail.com"];

export function isGoogleOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return GOOGLE_OWNER_EMAILS.includes(normalized);
}

export function isAllowedGoogleEmailOnAllowlist(email: string, allowlist: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (isGoogleOwnerEmail(normalized)) return true;
  if (allowlist.length === 0) return true;
  return allowlist.includes(normalized);
}
