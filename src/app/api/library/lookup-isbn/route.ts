import { NextResponse } from 'next/server';
import {
  getIsbnLookupVariants,
  isRetailIsbnBarcode,
  lookupBookByIsbn,
  normalizeIsbnDigits,
} from '@/lib/library/libraryCatalogLookup';
import { resolveReadingLevelSystemParam } from '@/lib/library/libraryReadingLevel';
import { isAiIsbnLookupConfigured, lookupBookByIsbnAi } from '@/lib/server/libraryAiIsbnLookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = normalizeIsbnDigits(searchParams.get('isbn') ?? '');
  if (!isRetailIsbnBarcode(isbn)) {
    return NextResponse.json({ error: 'Invalid ISBN barcode' }, { status: 400 });
  }

  const phase = searchParams.get('phase') === 'ai' ? 'ai' : 'catalog';
  const preferredSystem = resolveReadingLevelSystemParam(searchParams.get('readingLevelSystem'));
  const aiConfigured = isAiIsbnLookupConfigured();

  // Catalog-only first so the page can say when the slower AI step starts.
  if (phase === 'catalog') {
    const hit = await lookupBookByIsbn(isbn);
    return NextResponse.json({
      hit,
      meta: { aiConfigured, catalogHit: Boolean(hit) },
    });
  }

  if (!aiConfigured) {
    return NextResponse.json({
      hit: null,
      meta: {
        aiConfigured: false,
        catalogHit: false,
        aiAttempted: false,
        aiStatus: 'not_configured' as const,
      },
    });
  }

  const aiOutcome = await lookupBookByIsbnAi(getIsbnLookupVariants(isbn), preferredSystem);
  return NextResponse.json({
    hit: aiOutcome.hit,
    meta: {
      aiConfigured,
      catalogHit: false,
      aiAttempted: true,
      aiStatus: aiOutcome.status,
      aiError: aiOutcome.error,
    },
  });
}
