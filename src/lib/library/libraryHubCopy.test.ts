import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIBRARY_HUB_COPY,
  patchLibraryHubCopy,
  resolveLibraryHubCopy,
  sanitizeLibraryHubCopy,
} from './libraryHubCopy';

describe('libraryHubCopy', () => {
  it('uses the built-in welcome wording when nothing is saved', () => {
    expect(resolveLibraryHubCopy(undefined).welcomeHighlight).toBe('the Library');
    expect(resolveLibraryHubCopy({}).deskTitle).toBe('Librarian');
  });

  it('keeps custom wording and ignores blank or unknown fields', () => {
    expect(resolveLibraryHubCopy({ deskTitle: '  Media Desk  ', extra: 'nope' } as never).deskTitle).toBe(
      'Media Desk',
    );
    expect(sanitizeLibraryHubCopy({ deskTitle: 'Desk', bad: 1 })).toEqual({ deskTitle: 'Desk' });
    expect(sanitizeLibraryHubCopy('nope')).toBeUndefined();
  });

  it('drops a field when it is cleared or matches the default', () => {
    expect(patchLibraryHubCopy({ deskTitle: 'Media Desk' }, 'deskTitle', '')).toEqual({});
    expect(patchLibraryHubCopy({ deskTitle: 'Media Desk' }, 'deskTitle', DEFAULT_LIBRARY_HUB_COPY.deskTitle)).toEqual(
      {},
    );
    expect(patchLibraryHubCopy({}, 'enterLabel', 'Step inside')).toEqual({ enterLabel: 'Step inside' });
  });
});
