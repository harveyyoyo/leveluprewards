export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardDeveloperAuth } from '@/lib/apiAuth';
import {
  listMediaAssets,
  readMediaLabelsFile,
} from '@/lib/server/mediaAssetLibrary';

export async function GET(req: NextRequest) {
  const guarded = await guardDeveloperAuth(req, { maxRequests: 60 });
  if (!guarded.ok) return guarded.response;

  const library = listMediaAssets();
  const labels = readMediaLabelsFile();

  return NextResponse.json({
    clips: library.clips,
    screenshots: library.screenshots,
    labels,
  });
}
