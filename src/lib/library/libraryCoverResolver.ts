import { normalizeIsbnDigits } from '@/lib/library/libraryCatalogLookup';

/** In-memory cache of resolved cover URLs by normalized ISBN */
const memoryCache = new Map<string, string | null>();

/** In-flight promises to deduplicate concurrent lookups for the same ISBN */
const inflightLookups = new Map<string, Promise<string | null>>();

/** Simple concurrency limiter (max 3 concurrent network requests) */
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

function pumpQueue() {
  while (activeRequests < 3 && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) {
      activeRequests++;
      next();
    }
  }
}

function runLimited<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await task();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        activeRequests--;
        pumpQueue();
      }
    });
    pumpQueue();
  });
}

function readSessionCache(isbn: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const item = window.sessionStorage.getItem(`lib_cov_${isbn}`);
    if (item === '__none__') return null;
    if (item && item.startsWith('http')) return item;
  } catch {
    // Ignore storage restrictions / private browsing errors
  }
  return undefined;
}

function writeSessionCache(isbn: string, url: string | null) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`lib_cov_${isbn}`, url || '__none__');
  } catch {
    // Ignore quota errors
  }
}

/**
 * Synchronous cache lookup for an ISBN. Returns undefined if not yet looked up,
 * null if confirmed to have no online cover, or a URL string if found.
 */
export function getCachedCoverByIsbn(rawIsbn: string | null | undefined): string | null | undefined {
  if (!rawIsbn) return undefined;
  const isbn = normalizeIsbnDigits(rawIsbn);
  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) return undefined;

  if (memoryCache.has(isbn)) {
    return memoryCache.get(isbn);
  }

  const sessionVal = readSessionCache(isbn);
  if (sessionVal !== undefined) {
    memoryCache.set(isbn, sessionVal);
    return sessionVal;
  }

  return undefined;
}

/**
 * Asynchronously resolve a cover URL for an ISBN using cached results or the
 * backend lookup API. Concurrency is limited to prevent flooding.
 */
export async function resolveCoverByIsbn(rawIsbn: string | null | undefined): Promise<string | null> {
  if (!rawIsbn) return null;
  const isbn = normalizeIsbnDigits(rawIsbn);
  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) return null;

  // Check sync cache first
  const cached = getCachedCoverByIsbn(isbn);
  if (cached !== undefined) return cached;

  // Deduplicate in-flight requests
  const existing = inflightLookups.get(isbn);
  if (existing) return existing;

  const promise = runLimited(async () => {
    try {
      const res = await fetch(`/api/library/lookup-isbn?isbn=${encodeURIComponent(isbn)}`);
      if (!res.ok) {
        memoryCache.set(isbn, null);
        writeSessionCache(isbn, null);
        return null;
      }
      const data = (await res.json()) as { hit?: { coverUrl?: string } | null };
      const rawUrl = data.hit?.coverUrl?.trim();
      const coverUrl = rawUrl ? rawUrl.replace(/^http:\/\//i, 'https://') : null;

      memoryCache.set(isbn, coverUrl);
      writeSessionCache(isbn, coverUrl);
      return coverUrl;
    } catch {
      memoryCache.set(isbn, null);
      return null;
    } finally {
      inflightLookups.delete(isbn);
    }
  });

  inflightLookups.set(isbn, promise);
  return promise;
}
