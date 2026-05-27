import { describe, it, expect } from 'vitest';
import { sanitizeInternalNextPath } from './internalNextRedirect';

describe('sanitizeInternalNextPath', () => {
  const schoolId = 'ytt';

  // 1. Relative paths
  it('allows valid relative path for the school', () => {
    expect(sanitizeInternalNextPath('/ytt/portal', schoolId)).toBe('/ytt/portal');
    expect(sanitizeInternalNextPath('/ytt/office/billing', schoolId)).toBe('/ytt/office/billing');
    expect(sanitizeInternalNextPath('/ytt', schoolId)).toBe('/ytt');
  });

  it('rejects relative path for a different school', () => {
    expect(sanitizeInternalNextPath('/another/portal', schoolId)).toBeNull();
  });

  it('rejects relative path pointing to reserved routes or login', () => {
    expect(sanitizeInternalNextPath('/login', schoolId)).toBeNull();
    expect(sanitizeInternalNextPath('/ytt/login', schoolId)).toBeNull();
    expect(sanitizeInternalNextPath('/developer', schoolId)).toBeNull();
  });

  it('rejects malicious relative formats', () => {
    expect(sanitizeInternalNextPath('//attacker.com/ytt', schoolId)).toBeNull();
    expect(sanitizeInternalNextPath('/ytt/../portal', schoolId)).toBeNull();
  });

  // 2. Absolute URLs
  it('allows valid absolute URLs on trusted domains', () => {
    expect(sanitizeInternalNextPath('https://office.leveluprewards.app/ytt', schoolId)).toBe(
      'https://office.leveluprewards.app/ytt',
    );
    expect(sanitizeInternalNextPath('https://leveluprewards.app/ytt/portal', schoolId)).toBe(
      'https://leveluprewards.app/ytt/portal',
    );
    expect(sanitizeInternalNextPath('http://localhost:3000/ytt/office', schoolId)).toBe(
      'http://localhost:3000/ytt/office',
    );
    expect(sanitizeInternalNextPath('http://127.0.0.1/ytt', schoolId)).toBe(
      'http://127.0.0.1/ytt',
    );
  });

  it('rejects absolute URLs on untrusted domains', () => {
    expect(sanitizeInternalNextPath('https://attacker.com/ytt', schoolId)).toBeNull();
    expect(sanitizeInternalNextPath('https://levelupprewards.app/ytt', schoolId)).toBeNull();
    expect(sanitizeInternalNextPath('https://google.com', schoolId)).toBeNull();
  });

  it('rejects absolute URLs with invalid paths', () => {
    expect(sanitizeInternalNextPath('https://office.leveluprewards.app/another-school', schoolId)).toBeNull();
    expect(sanitizeInternalNextPath('https://office.leveluprewards.app/login', schoolId)).toBeNull();
  });
});
