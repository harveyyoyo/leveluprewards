export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { validateSiteContactBody } from '@/lib/siteContact';

const MAX_BODY_BYTES = 12 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`site-contact:${clientIp(req)}`, 6, 60_000)) {
      return jsonError(429, 'Too many requests. Please try again in a minute.');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Request too large');

    const body = await req.json();
    const validated = validateSiteContactBody(body);
    if (!validated.ok) return jsonError(400, validated.error);

    const db = await getDb();
    const referer = req.headers.get('referer')?.trim().slice(0, 500) ?? '';

    await db.collection('siteContactSubmissions').add({
      ...validated.data,
      referer: referer || null,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/site-contact] POST failed:', e);
    return jsonError(
      503,
      'We could not send your message right now. Please try again shortly.',
    );
  }
}
