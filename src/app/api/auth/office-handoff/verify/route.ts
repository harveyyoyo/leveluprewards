import { NextRequest, NextResponse } from 'next/server';
import { verifyOfficeHandoffMeta } from '@/lib/auth/officeHandoff';
import { jsonError, sameOrigin } from '@/lib/server/apiSecurity';

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

  return NextResponse.json(claims);
}
