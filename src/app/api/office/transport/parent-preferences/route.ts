import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { transportParentAccessIsUsable } from '@/lib/office/transportParentAccess';
import { TRANSPORT_PARENT_COOKIE_NAME, verifyTransportParentSession } from '@/lib/server/transportParentSession';
import type { OfficeTransportParentAccess } from '@/lib/office/transportParentAccess';

export const dynamic = 'force-dynamic';

function noStore() {
  return { 'Cache-Control': 'no-store' };
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`transport-parent-preferences:${clientIp(req)}`, 30)) return jsonError(429, 'Too many requests.');
    const raw = req.cookies.get(TRANSPORT_PARENT_COOKIE_NAME)?.value;
    if (!raw) return jsonError(401, 'Sign in with your private bus access code.');
    const session = await verifyTransportParentSession(raw);
    if (!session) return jsonError(401, 'Your bus access has expired. Sign in again.');

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    if (!schoolId || schoolId !== session.schoolId) return jsonError(400, 'School access is invalid.');
    const now = Date.now();
    const arrivalPreferences = {
      email: booleanValue(body.email),
      sms: booleanValue(body.sms),
      whatsapp: booleanValue(body.whatsapp),
      updatedAt: now,
    };
    const db = await getFirebaseAdminFirestore();
    const ref = db.collection('schools').doc(schoolId).collection('officeTransportParentAccess').doc(session.accessId);
    const snap = await ref.get();
    const access = snap.exists ? ({ id: snap.id, ...snap.data() } as OfficeTransportParentAccess) : null;
    if (!access || !transportParentAccessIsUsable(access)) return jsonError(401, 'This bus access is no longer active.');
    await ref.update({ arrivalPreferences, updatedAt: now, updatedBy: 'parent' });
    return NextResponse.json({ ok: true, arrivalPreferences }, { headers: noStore() });
  } catch {
    return jsonError(503, 'Could not save bus message choices.');
  }
}
