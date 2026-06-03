export const dynamic = 'force-dynamic';

import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import {
  contentTypeForPath,
  resolveMediaAssetFile,
} from '@/lib/server/mediaAssetLibrary';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')?.replace(/\\/g, '/') ?? '';
  if (!path || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const filePath = resolveMediaAssetFile(path);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    headers: {
      'Content-Type': contentTypeForPath(path),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
