import type { User } from 'firebase/auth';

import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';

export function getDeveloperGoogleEmailAllowlist(): string[] {
  return (process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedDeveloperGoogleUser(user: User | null | undefined): boolean {
  if (!user || user.isAnonymous) return false;

  const email = (user.email ?? '').trim().toLowerCase();
  if (!email) return false;

  const hasGoogleProvider = user.providerData.some((p) => p.providerId === 'google.com');
  if (!hasGoogleProvider) return false;

  return isAllowedGoogleEmailOnAllowlist(email, getDeveloperGoogleEmailAllowlist());
}

