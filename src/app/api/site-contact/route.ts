export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { persistSiteContactSubmission } from '@/lib/server/persistSiteContactSubmission';
import { validateSiteContactBody } from '@/lib/siteContact';

const MAX_BODY_BYTES = 12 * 1024;

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

    const referer = req.headers.get('referer')?.trim().slice(0, 500) ?? '';

    await persistSiteContactSubmission({
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
