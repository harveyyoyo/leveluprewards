import { describe, expect, it } from 'vitest';
import { hitFromAiResult, parseAiHit } from '@/lib/server/libraryAiIsbnLookup';

describe('libraryAiIsbnLookup parsing', () => {
  it('parseAiHit accepts JSON wrapped in markdown fences', () => {
    const hit = parseAiHit(
      '```json\n{"found":true,"title":"What a Story!","author":"Rabbi Yechiel Spero","category":"Non-fiction","publisher":"ArtScroll","publishedYear":"2022"}\n```',
      '9781422631157',
    );
    expect(hit).toMatchObject({
      title: 'What a Story!',
      author: 'Rabbi Yechiel Spero',
      source: 'ai',
      isbn: '9781422631157',
    });
  });

  it('hitFromAiResult returns null when found is false even with a title', () => {
    expect(
      hitFromAiResult({ found: false, title: 'What a Story!' }, '9781422631157'),
    ).toBeNull();
  });

  it('hitFromAiResult returns null when found is true but title is empty', () => {
    expect(hitFromAiResult({ found: true, title: '   ' }, '9781422631157')).toBeNull();
  });

  it('hitFromAiResult maps a confident AI match to a catalog hit', () => {
    expect(
      hitFromAiResult(
        {
          found: true,
          title: 'What a Story!',
          author: 'Rabbi Yechiel Spero',
          publisher: 'ArtScroll Mesorah Publications',
          publishedYear: '2022',
        },
        '9781422631157',
      ),
    ).toEqual({
      title: 'What a Story!',
      author: 'Rabbi Yechiel Spero',
      isbn: '9781422631157',
      publisher: 'ArtScroll Mesorah Publications',
      publishedYear: '2022',
      source: 'ai',
    });
  });

  it('parseAiHit returns null for invalid JSON', () => {
    expect(parseAiHit('not json at all', '9781422631157')).toBeNull();
  });
});
