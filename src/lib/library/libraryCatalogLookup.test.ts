import { describe, expect, it } from 'vitest';
import {
  firstHit,
  isLikelyIsbnBookNumber,
  isLikelyStoreProductBarcode,
  isSuspiciousCatalogTitle,
  parseIsbnSearchOrgHtml,
  pickBestTitleHit,
  titleMatchScore,
  unwrapRepeatedBookScan,
} from './libraryCatalogLookup';

function delayed<T>(ms: number, value: T): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const SAMPLE_HTML = `
<div class="bookinfo">
  <h1>What a Story! Captivating Stories Rich with Meaning</h1>
  <p><strong>Author:</strong> Yechiel Spero</p>
  <p><strong>Publisher:</strong> ArtScroll, Mesorah Publications, Limited</p>
  <p><strong>Published:</strong> 2022</p>
</div>
`;

describe('parseIsbnSearchOrgHtml', () => {
  it('extracts title, author, publisher, and year from isbnsearch.org HTML', () => {
    const hit = parseIsbnSearchOrgHtml(SAMPLE_HTML, '9781422631157');
    expect(hit).toEqual({
      title: 'What a Story! Captivating Stories Rich with Meaning',
      author: 'Yechiel Spero',
      isbn: '9781422631157',
      publisher: 'ArtScroll, Mesorah Publications, Limited',
      publishedYear: '2022',
      source: 'isbnsearch',
    });
  });

  it('rejects bot challenge pages like "Please Verify to Continue"', () => {
    const botHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Please Verify to Continue</title></head>
        <body>
          <h1>Please Verify to Continue</h1>
          <p>Checking your browser before accessing isbnsearch.org.</p>
        </body>
      </html>
    `;
    expect(parseIsbnSearchOrgHtml(botHtml, '9781400065820')).toBeNull();
  });

  it('returns null when the page has no title heading or book markers', () => {
    expect(parseIsbnSearchOrgHtml('<p>Not found</p>', '9781422631157')).toBeNull();
  });

  it('flags suspicious bot and error titles', () => {
    expect(isSuspiciousCatalogTitle('Please Verify to Continue')).toBe(true);
    expect(isSuspiciousCatalogTitle('Just a moment...')).toBe(true);
    expect(isSuspiciousCatalogTitle('Attention Required! | Cloudflare')).toBe(true);
    expect(isSuspiciousCatalogTitle('403 Forbidden')).toBe(true);
    expect(isSuspiciousCatalogTitle('A Doubter\'s Almanac')).toBe(false);
  });
});

describe('firstHit', () => {
  it('resolves with the fast task even when a slower task is still pending', async () => {
    const result = await firstHit([delayed(30, null), delayed(5, 'fast'), delayed(50, 'slow')]);
    expect(result).toBe('fast');
  });

  it('keeps waiting past an immediate null result for a later hit', async () => {
    const result = await firstHit([() => Promise.resolve(null), delayed(10, 'eventual')]);
    expect(result).toBe('eventual');
  });

  it('resolves null when every task misses or rejects', async () => {
    const result = await firstHit<string>([
      () => Promise.resolve(null),
      () => Promise.reject(new Error('boom')),
    ]);
    expect(result).toBeNull();
  });

  it('resolves null immediately for an empty task list', async () => {
    expect(await firstHit([])).toBeNull();
  });
});

describe('pickBestTitleHit', () => {
  it('skips the first result when a later hit is the actual title', () => {
    const best = pickBestTitleHit('Harry Potter and the Philosopher\'s Stone', [
      { title: 'Harry Potter Movie Magic', author: 'Brian Sibley', source: 'google' },
      { title: 'Harry Potter and the Philosopher\'s Stone', author: 'J. K. Rowling', source: 'google' },
    ]);
    expect(best?.title).toBe('Harry Potter and the Philosopher\'s Stone');
    expect(best?.author).toBe('J. K. Rowling');
  });

  it('returns null when no online title is close enough', () => {
    expect(
      pickBestTitleHit('Hoot', [
        { title: 'How to Train Your Dragon', author: 'Cressida Cowell', source: 'google' },
      ]),
    ).toBeNull();
  });

  it('scores an exact title higher than a partial match', () => {
    expect(titleMatchScore('Hoot', 'Hoot')).toBe(1);
    expect(titleMatchScore('Hoot', 'How to Train Your Dragon')).toBeLessThan(0.5);
  });
});

describe('unwrapRepeatedBookScan', () => {
  it('keeps one copy when the same ISBN is scanned twice stuck together', () => {
    expect(unwrapRepeatedBookScan('97814197002319781419700231')).toBe('9781419700231');
  });

  it('leaves a normal ISBN alone', () => {
    expect(unwrapRepeatedBookScan('9781419700231')).toBe('9781419700231');
  });
});

describe('store vs book barcodes', () => {
  it('treats ISBN-13 as a book number', () => {
    expect(isLikelyIsbnBookNumber('9781419700231')).toBe(true);
    expect(isLikelyStoreProductBarcode('9781419700231')).toBe(false);
  });

  it('treats a 12-digit store UPC as a store barcode', () => {
    expect(isLikelyStoreProductBarcode('012345678905')).toBe(true);
    expect(isLikelyIsbnBookNumber('012345678905')).toBe(false);
  });
});

describe('searchBooksByTitle', () => {
  it('returns empty array when given an empty or whitespace string', async () => {
    const { searchBooksByTitle } = await import('./libraryCatalogLookup');
    expect(await searchBooksByTitle('')).toEqual([]);
    expect(await searchBooksByTitle('   ')).toEqual([]);
  });
});
