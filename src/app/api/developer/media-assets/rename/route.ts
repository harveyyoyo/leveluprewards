export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardDeveloperRoute } from '@/lib/apiAuth';
import { renameMediaAsset } from '@/lib/server/mediaAssetLibrary';

export async function POST(req: NextRequest) {
  const guarded = await guardDeveloperRoute(req, { maxRequests: 30 });
  if (!guarded.ok) return guarded.response;

  const path = String(guarded.value.body.path ?? '').replace(/\\/g, '/');
  const newFilename = String(guarded.value.body.newFilename ?? '').trim();

  if (!path || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }
  if (!newFilename) {
    return NextResponse.json({ error: 'newFilename required' }, { status: 400 });
  }

  try {
    const result = renameMediaAsset(path, newFilename);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Rename failed' },
      { status: 400 },
    );
  }
}
