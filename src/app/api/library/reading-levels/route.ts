import { NextResponse } from 'next/server';
import { getIsbnLookupVariants } from '@/lib/library/libraryCatalogLookup';
import { resolveReadingLevelSystemParam, type LibraryReadingLevelSystem } from '@/lib/library/libraryReadingLevel';
import { isAiIsbnLookupConfigured, lookupBookByIsbnAi, lookupBookByTitleAi } from '@/lib/server/libraryAiIsbnLookup';

export const maxDuration = 60;

type ReadingLevelRequestItem = { id: string; isbn?: string; title: string; author?: string };
type ReadingLevelResult = { id: string; readingLevel: string | null; status: 'matched' | 'no_match' | 'error' };

const MAX_ITEMS_PER_REQUEST = 10;
const CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function lookupOneReadingLevel(
  item: ReadingLevelRequestItem,
  preferredSystem: LibraryReadingLevelSystem,
): Promise<ReadingLevelResult> {
  const title = (item.title || '').trim();
  try {
    if (item.isbn) {
      const variants = getIsbnLookupVariants(item.isbn);
      if (variants.length) {
        const outcome = await lookupBookByIsbnAi(variants, preferredSystem);
        if (outcome.hit?.readingLevel) {
          return { id: item.id, readingLevel: outcome.hit.readingLevel, status: 'matched' };
        }
      }
    }
    if (title) {
      const outcome = await lookupBookByTitleAi(title, preferredSystem);
      if (outcome.hit?.readingLevel) {
        return { id: item.id, readingLevel: outcome.hit.readingLevel, status: 'matched' };
      }
    }
    return { id: item.id, readingLevel: null, status: 'no_match' };
  } catch {
    return { id: item.id, readingLevel: null, status: 'error' };
  }
}

/**
 * Best-effort bulk reading-level lookup (AI web search) for the "fill in
 * missing reading levels" library tool. Free catalog sources (Open Library,
 * Google Books) never carry Lexile/AR/grade data, so this only tries AI
 * search — same source as the single-book lookup, just batched.
 */
export async function POST(request: Request) {
  if (!isAiIsbnLookupConfigured()) {
    return NextResponse.json({ results: [], aiConfigured: false });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? (body.items as ReadingLevelRequestItem[]) : [];
  if (!items.length || items.length > MAX_ITEMS_PER_REQUEST) {
    return NextResponse.json({ error: `Send 1 to ${MAX_ITEMS_PER_REQUEST} books per request.` }, { status: 400 });
  }
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id) {
      return NextResponse.json({ error: 'Each book needs an id.' }, { status: 400 });
    }
  }

  const preferredSystem = resolveReadingLevelSystemParam(body?.readingLevelSystem);
  const results = await mapWithConcurrency(items, CONCURRENCY, (item) => lookupOneReadingLevel(item, preferredSystem));
  return NextResponse.json({ results, aiConfigured: true });
}
