import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import {
  signTransportParentSession,
  TRANSPORT_PARENT_COOKIE_NAME,
} from '@/lib/server/transportParentSession';
import { transportParentAccessIsUsable } from '@/lib/office/transportParentAccess';
import type { OfficeTransportParentAccess } from '@/lib/office/transportParentAccess';
import type { OfficeFamily } from '@/lib/office/types';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const LINK_TOKEN_RE = /^[A-Za-z0-9_-]{40,120}$/;

function linkHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`transport-parent-link-session:${clientIp(req)}`, 12)) {
      return jsonError(429, 'Too many attempts. Try again later.');
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const linkToken = typeof body.linkToken === 'string' ? body.linkToken.trim() : '';
    if (!SCHOOL_ID_RE.test(schoolId) || !LINK_TOKEN_RE.test(linkToken)) {
      return jsonError(400, 'That private bus link is invalid.');
    }

    const db = await getFirebaseAdminFirestore();
    const accessCollection = db.collection('schools').doc(schoolId).collection('officeTransportParentAccess');
    const snap = await accessCollection.where('linkTokenHash', '==', linkHash(linkToken)).limit(1).get();
    const accessDoc = snap.docs[0];
    const access = accessDoc?.data() as (OfficeTransportParentAccess & { linkTokenHash?: string }) | undefined;
    if (!accessDoc || !access || !access.linkTokenHash || !transportParentAccessIsUsable(access)) {
      return jsonError(401, 'That private bus link is no longer active.');
    }

    const familySnap = await db.collection('schools').doc(schoolId).collection('officeFamilies').doc(access.familyId).get();
    const family = familySnap.exists ? ({ id: familySnap.id, ...familySnap.data() } as OfficeFamily) : null;
    if (!family || family.archived === true) return jsonError(401, 'That private bus link is no longer active.');

    const session = await signTransportParentSession({ schoolId, accessId: access.id });
    if (!session) return jsonError(503, 'Private bus access is not set up on this server.');

    const now = Date.now();
    await accessDoc.ref.update({ lastUsedAt: now, updatedAt: now, updatedBy: 'parent' });
    const response = NextResponse.json({ ok: true, expiresAt: access.expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(TRANSPORT_PARENT_COOKIE_NAME, session, {
      ...authCookieFlags(),
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return jsonError(503, 'Private bus access is temporarily unavailable.');
  }
}
