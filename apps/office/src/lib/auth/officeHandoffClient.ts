'use client';

import type { OfficeHandoffClaims } from '@/lib/auth/officeHandoff';

/**
 * Client verifies handoff meta via API (keeps secret off the client bundle).
 */
export async function verifyOfficeHandoffMetaClient(
  token: string,
): Promise<OfficeHandoffClaims | null> {
  try {
    const res = await fetch('/api/auth/office-handoff/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta: token }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OfficeHandoffClaims;
    if (!data?.uid || !data?.schoolId || !data?.loginState) return null;
    return data;
  } catch {
    return null;
  }
}
