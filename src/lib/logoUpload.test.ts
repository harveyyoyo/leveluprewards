import { describe, it, expect } from 'vitest';
import {
  isAllowedLogoFile,
  isSvgLogoFile,
  resolveLogoContentType,
} from './logoUpload';

describe('logoUpload', () => {
  it('accepts image/svg+xml MIME type', () => {
    const file = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    expect(isAllowedLogoFile(file)).toBe(true);
    expect(isSvgLogoFile(file)).toBe(true);
  });

  it('accepts .svg when the browser omits MIME type', () => {
    const file = new File(['<svg></svg>'], 'logo.svg', { type: '' });
    expect(isAllowedLogoFile(file)).toBe(true);
    expect(resolveLogoContentType(file)).toBe('image/svg+xml');
  });

  it('rejects unrelated formats', () => {
    const file = new File(['x'], 'logo.gif', { type: 'image/gif' });
    expect(isAllowedLogoFile(file)).toBe(false);
  });
});
