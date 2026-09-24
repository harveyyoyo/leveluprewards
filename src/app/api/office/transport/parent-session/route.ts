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

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const CODE_RE = /^[A-Za-z0-9_-]{20,120}$/;

function codeHash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function noStore() {
  return { 'Cache-Control': 'no-store' };
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
  const response = NextResponse.json({ ok: true }, { headers: noStore() });
  response.cookies.set(TRANSPORT_PARENT_COOKIE_NAME, '', { ...authCookieFlags(), maxAge: 0 });
  return response;
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`transport-parent-session:${clientIp(req)}`, 12)) return jsonError(429, 'Too many attempts. Try again later.');

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!SCHOOL_ID_RE.test(schoolId) || !CODE_RE.test(code)) return jsonError(400, 'Enter the private bus access code.');

    const db = await getFirebaseAdminFirestore();
    const snap = await db.collection('schools').doc(schoolId).collection('officeTransportParentAccess').where('codeHash', '==', codeHash(code)).limit(1).get();
    const access = snap.docs[0]?.data() as (OfficeTransportParentAccess & { codeHash: string }) | undefined;
    if (!access || !transportParentAccessIsUsable(access)) return jsonError(401, 'That bus access code is not active.');

    const token = await signTransportParentSession({ schoolId, accessId: access.id });
    if (!token) return jsonError(503, 'Private bus access is not set up on this server.');

    const now = Date.now();
    await snap.docs[0].ref.update({ lastUsedAt: now, updatedAt: now, updatedBy: 'parent' });
    const response = NextResponse.json({ ok: true, expiresAt: access.expiresAt }, { headers: noStore() });
    response.cookies.set(TRANSPORT_PARENT_COOKIE_NAME, token, {
      ...authCookieFlags(),
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return jsonError(503, 'Private bus access is temporarily unavailable.');
  }
}
