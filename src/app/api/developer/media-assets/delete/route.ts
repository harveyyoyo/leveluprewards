export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardDeveloperRoute } from '@/lib/apiAuth';
import { deleteMediaAsset } from '@/lib/server/mediaAssetLibrary';

export async function POST(req: NextRequest) {
  const guarded = await guardDeveloperRoute(req, { maxRequests: 20 });
  if (!guarded.ok) return guarded.response;

  const path = String(guarded.value.body.path ?? '').replace(/\\/g, '/');
  if (!path || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  deleteMediaAsset(path);
  return NextResponse.json({ ok: true, path });
}
