import { describe, expect, it } from 'vitest';
import { parseIsbnSearchOrgHtml } from './libraryCatalogLookup';

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
