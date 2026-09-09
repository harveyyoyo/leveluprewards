import { describe, expect, it } from 'vitest';
import { firstHit, parseIsbnSearchOrgHtml } from './libraryCatalogLookup';

function delayed<T>(ms: number, value: T): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const SAMPLE_HTML = `
<h1>What a Story! Captivating Stories Rich with Meaning</h1>
<p><strong>Author:</strong> Yechiel Spero</p>
<p><strong>Publisher:</strong> ArtScroll, Mesorah Publications, Limited</p>
<p><strong>Published:</strong> 2022</p>
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

  it('returns null when the page has no title heading', () => {
    expect(parseIsbnSearchOrgHtml('<p>Not found</p>', '9781422631157')).toBeNull();
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
