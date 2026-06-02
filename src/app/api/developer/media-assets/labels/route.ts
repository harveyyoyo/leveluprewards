export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardDeveloperRoute } from '@/lib/apiAuth';
import {
  normalizeMediaLabelsFile,
  type MediaAssetLabelsFile,
} from '@/lib/marketing/mediaAssetTypes';
import { writeMediaLabelsFile } from '@/lib/server/mediaAssetLibrary';

export async function POST(req: NextRequest) {
  const guarded = await guardDeveloperRoute(req, {
    maxRequests: 20,
    maxBodyBytes: 512 * 1024,
  });
  if (!guarded.ok) return guarded.response;

  const raw = guarded.value.body as Partial<MediaAssetLabelsFile>;
  const payload = normalizeMediaLabelsFile({
    ...raw,
    updatedAt: new Date().toISOString(),
  });
  writeMediaLabelsFile(payload);

  return NextResponse.json({ ok: true, labels: payload });
}
