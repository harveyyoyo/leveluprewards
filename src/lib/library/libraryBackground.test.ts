import { describe, expect, it } from 'vitest';
import {
  LIBRARY_BACKGROUND_DIM_DEFAULT,
  clampLibraryBackgroundDim,
  sanitizeLibraryBackgroundImageUrl,
  validateLibraryBackgroundFile,
} from './libraryBackground';

describe('libraryBackground', () => {
  it('keeps https picture links and drops anything else', () => {
    expect(sanitizeLibraryBackgroundImageUrl('https://example.com/library.jpg')).toBe(
      'https://example.com/library.jpg',
    );
    expect(sanitizeLibraryBackgroundImageUrl('  https://cdn.example/a.png  ')).toBe(
      'https://cdn.example/a.png',
    );
    expect(sanitizeLibraryBackgroundImageUrl('http://insecure.example/a.png')).toBeUndefined();
    expect(sanitizeLibraryBackgroundImageUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeLibraryBackgroundImageUrl('data:image/png;base64,aaaa')).toBeUndefined();
    expect(sanitizeLibraryBackgroundImageUrl('')).toBeUndefined();
    expect(sanitizeLibraryBackgroundImageUrl(null)).toBeUndefined();
  });

  it('clamps the wash so words stay readable', () => {
    expect(clampLibraryBackgroundDim(undefined)).toBe(LIBRARY_BACKGROUND_DIM_DEFAULT);
    expect(clampLibraryBackgroundDim(58.6)).toBe(59);
    expect(clampLibraryBackgroundDim(10)).toBe(30);
    expect(clampLibraryBackgroundDim(99)).toBe(80);
    expect(clampLibraryBackgroundDim(Number.NaN)).toBe(LIBRARY_BACKGROUND_DIM_DEFAULT);
  });

  it('accepts common photo types under 8 MB', () => {
    expect(validateLibraryBackgroundFile({ type: 'image/jpeg', size: 500_000 })).toBeNull();
    expect(validateLibraryBackgroundFile({ type: 'image/png', size: 500_000 })).toBeNull();
    expect(validateLibraryBackgroundFile({ type: 'image/gif', size: 500_000 })).toMatch(/JPEG, PNG, or WebP/);
    expect(validateLibraryBackgroundFile({ type: 'image/jpeg', size: 9 * 1024 * 1024 })).toMatch(/too big/);
  });
});
