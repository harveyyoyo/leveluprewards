import { NextRequest, NextResponse } from 'next/server';
import { verifyOfficeHandoffMeta } from '@/lib/auth/officeHandoff';
import { jsonError, sameOrigin } from '@/lib/server/apiSecurity';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';

/**
 * Records that a handoff jti has been redeemed. Uses `.create()` so a second
 * redemption of the same jti (replay of a leaked handoff URL) fails atomically.
 */
async function consumeHandoffOnce(jti: string): Promise<boolean> {
  try {
    const db = await getFirebaseAdminFirestore();
    await db.collection('officeHandoffConsumed').doc(jti).create({ consumedAt: Date.now() });
    return true;
  } catch (e) {
    // gRPC code 6 = ALREADY_EXISTS, the expected outcome on a genuine replay. Anything
    // else (missing/misconfigured Admin credentials, Firestore outage, etc.) fails
    // closed the same way (a legitimate first-time handoff must not be let through on
    // an infra error), but gets logged so it is not mistaken for an actual replay.
    const code = (e as { code?: number | string })?.code;
    if (code !== 6 && code !== 'already-exists') {
      console.error('[office-handoff/verify] consumeHandoffOnce failed (not a replay):', e);
    }
    return false;
  }
}

/** POST: verify handoff meta JWT (client bootstrap; secret stays server-side). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return jsonError(403, 'Forbidden');
  }

  const body = await req.json().catch(() => ({}));
  const meta = typeof body?.meta === 'string' ? body.meta.trim() : '';
  if (!meta) {
    return jsonError(400, 'meta required');
  }

  const claims = await verifyOfficeHandoffMeta(meta);
  if (!claims) {
    return jsonError(403, 'Invalid or expired handoff');
  }

  if (!(await consumeHandoffOnce(claims.jti))) {
    return jsonError(403, 'This office sign-in link was already used.');
  }

  return NextResponse.json(claims);
}
