import { NextResponse } from 'next/server';
import { searchBooksByTitle } from '@/lib/library/libraryCatalogLookup';
import { isAiIsbnLookupConfigured, lookupBookByTitleAi } from '@/lib/server/libraryAiIsbnLookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') ?? '').trim();
  if (title.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const hits = await searchBooksByTitle(title, 8);
  if (hits.length) {
    return NextResponse.json({ hits, meta: { aiUsed: false } });
  }

  if (!isAiIsbnLookupConfigured()) {
    return NextResponse.json({ hits: [], meta: { aiUsed: false } });
  }

  const ai = await lookupBookByTitleAi(title);
  return NextResponse.json({
    hits: ai.hit ? [ai.hit] : [],
    meta: { aiUsed: true, aiStatus: ai.status, aiError: ai.error },
  });
}
