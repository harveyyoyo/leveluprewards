import { NextResponse } from 'next/server';
import { isRetailIsbnBarcode, lookupBookByIsbn, normalizeIsbnDigits } from '@/lib/library/libraryCatalogLookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = normalizeIsbnDigits(searchParams.get('isbn') ?? '');
  if (!isRetailIsbnBarcode(isbn)) {
    return NextResponse.json({ error: 'Invalid ISBN barcode' }, { status: 400 });
  }
  const hit = await lookupBookByIsbn(isbn);
  return NextResponse.json({ hit });
}
