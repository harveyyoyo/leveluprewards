import { createHmac, timingSafeEqual } from 'crypto';
import { getAuthGateSecret } from '@/lib/auth/schoolGateCookie';
import {
  DEMO_LINK_KEY_PARAM,
  resolveDemoLinkTarget,
  type DemoLinkTarget,
} from '@/lib/demoSchoolLink';
import { PUBLIC_SAMPLE_SCHOOL_IDS, type PublicSampleSchoolId } from '@/lib/sampleSchools';

/**
 * Key in owner-made demo links, one per demo school. It is signed with AUTH_GATE_SIGNING_SECRET,
 * so only the server can make it, and the server only hands it to developer (owner) accounts.
 */
export function demoShareKey(schoolId: PublicSampleSchoolId): string | null {
  const secret = getAuthGateSecret();
  if (!secret) return null;
  return createHmac('sha256', secret)
    .update(`levelup:demo-share:v1:${schoolId}`)
    .digest('base64url')
    .slice(0, 22);
}

/** Keys for every demo school, or null when the signing secret is not configured. */
export function demoShareKeys(): Record<PublicSampleSchoolId, string> | null {
  const keys: Partial<Record<PublicSampleSchoolId, string>> = {};
  for (const schoolId of PUBLIC_SAMPLE_SCHOOL_IDS) {
    const key = demoShareKey(schoolId);
    if (!key) return null;
    keys[schoolId] = key;
  }
  return keys as Record<PublicSampleSchoolId, string>;
}

function keyMatches(expected: string | null, given: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type DemoLinkCheck = { ok: true; target: DemoLinkTarget } | { ok: false; redirectTo: string };

/**
 * A `/demo/…` link with the owner's key opens its page without the passcode. Anything else goes
 * to the normal sign-in, with the demo school filled in and the page kept as the destination.
 */
export function checkDemoLink(pathname: string, search: string): DemoLinkCheck {
  const target = resolveDemoLinkTarget(pathname, search);
  if (!target) return { ok: false, redirectTo: '/login' };

  const given = new URLSearchParams(search).get(DEMO_LINK_KEY_PARAM) ?? '';
  if (keyMatches(demoShareKey(target.schoolId), given)) return { ok: true, target };

  const params = new URLSearchParams({ school: target.schoolId, next: target.href });
  return { ok: false, redirectTo: `/login?${params}` };
}
