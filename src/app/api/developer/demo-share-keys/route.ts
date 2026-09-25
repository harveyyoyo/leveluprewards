export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardDeveloperAuth } from '@/lib/apiAuth';
import { demoShareKeys } from '@/lib/server/demoShareKey';

/** Owner only: the keys that make demo links open without the passcode (one per demo school). */
export async function GET(req: NextRequest) {
  const guarded = await guardDeveloperAuth(req);
  if (!guarded.ok) return guarded.response;

  const keys = demoShareKeys();
  if (!keys) {
    return NextResponse.json(
      { error: 'Demo share links are not set up on this server (AUTH_GATE_SIGNING_SECRET).' },
      { status: 503 },
    );
  }
  return NextResponse.json({ keys }, { headers: { 'Cache-Control': 'no-store' } });
}
