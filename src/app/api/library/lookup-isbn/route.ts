import { NextResponse } from 'next/server';
import {
  getIsbnLookupVariants,
  isRetailIsbnBarcode,
  lookupBookByIsbn,
  normalizeIsbnDigits,
} from '@/lib/library/libraryCatalogLookup';
import { isAiIsbnLookupConfigured, lookupBookByIsbnAi } from '@/lib/server/libraryAiIsbnLookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = normalizeIsbnDigits(searchParams.get('isbn') ?? '');
  if (!isRetailIsbnBarcode(isbn)) {
    return NextResponse.json({ error: 'Invalid ISBN barcode' }, { status: 400 });
  }

  const aiConfigured = isAiIsbnLookupConfigured();
  const hit = await lookupBookByIsbn(isbn);
  if (hit) {
    return NextResponse.json({ hit, meta: { aiConfigured, catalogHit: true } });
  }

  // Free catalogs (Open Library, Google Books, isbnsearch.org) don't index every
  // book — e.g. niche/specialty publishers. Fall back to an AI best-effort guess
  // that the client surfaces as unconfirmed for the librarian to verify.
  const aiOutcome = aiConfigured
    ? await lookupBookByIsbnAi(getIsbnLookupVariants(isbn))
    : { hit: null, status: 'not_configured' as const };
  return NextResponse.json({
    hit: aiOutcome.hit,
    meta: {
      aiConfigured,
      catalogHit: false,
      aiAttempted: aiConfigured,
      aiStatus: aiOutcome.status,
      aiError: aiOutcome.error,
    },
  });
}
