export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { guardDeveloperRoute } from '@/lib/apiAuth';
import { runMediaAssetRecapture } from '@/lib/server/mediaAssetRecapture';

export async function POST(req: NextRequest) {
  const guarded = await guardDeveloperRoute(req, {
    maxRequests: 8,
    maxBodyBytes: 4096,
  });
  if (!guarded.ok) return guarded.response;

  const path = String(guarded.value.body.path ?? '').replace(/\\/g, '/');
  if (!path || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const result = await runMediaAssetRecapture(path);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Recapture failed',
        exitCode: result.exitCode,
        output: result.output,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    path,
    output: result.output,
  });
}
