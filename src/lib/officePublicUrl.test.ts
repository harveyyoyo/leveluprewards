import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  officeAbsoluteHref,
  officePortalEntryHref,
  officePortalHandoffHref,
  officePublicHref,
  schoolPortalHref,
} from './officePublicUrl';

describe('officePublicUrl', () => {
  const envKeys = ['OFFICE_CANONICAL_HOST', 'NEXT_PUBLIC_OFFICE_CANONICAL_HOST'] as const;

  afterEach(() => {
    for (const key of envKeys) {
      if (process.env[key] === undefined) {
        delete process.env[key];
      }
    }
  });

  it('uses legacy paths when office subdomain is not configured', () => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    expect(officePublicHref('Yeshiva', 'grades')).toBe('/yeshiva/office/grades');
    expect(officePortalEntryHref('yeshiva')).toBe('/yeshiva/office');
    expect(officePortalHandoffHref('yeshiva')).toBe('/yeshiva/office');
  });

  it('uses clean paths on office.localhost without canonical env', () => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'office.localhost:3000',
    } as Location);
    expect(officePublicHref('Yeshiva', 'grades')).toBe('/yeshiva/grades');
    expect(officePortalEntryHref('yeshiva')).toBe('/yeshiva');
    locationSpy.mockRestore();
  });

  it('uses legacy paths on production hosts when only dev origin is baked in', () => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    process.env.NEXT_PUBLIC_OFFICE_DEV_ORIGIN = 'http://127.0.0.1:3001';
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      origin: 'https://portal.leveluprewards.app',
    } as Location);
    expect(officePublicHref('Yeshiva', 'grades')).toBe('/yeshiva/office/grades');
    expect(officePortalEntryHref('yeshiva')).toBe('/yeshiva/office');
    expect(officePortalHandoffHref('yeshiva')).toBe('/yeshiva/office');
    locationSpy.mockRestore();
  });

  it('uses office subdomain for public links when explicitly configured', () => {
    process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST = 'office.leveluprewards.app';
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'leveluprewards.app',
    } as Location);
    expect(officePublicHref('Yeshiva')).toBe('https://office.leveluprewards.app/yeshiva');
    expect(officePortalEntryHref('yeshiva')).toBe('https://office.leveluprewards.app/yeshiva');
    expect(officePortalHandoffHref('yeshiva')).toBe(
      '/api/auth/office-handoff/redirect?school=yeshiva',
    );
    locationSpy.mockRestore();
  });

  it('keeps school portal links on the old portal host while the main site is elsewhere', () => {
    const previous = process.env.PORTAL_CANONICAL_HOST;
    process.env.PORTAL_CANONICAL_HOST = 'leveluprewards.app';
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
    } as Location);
    try {
      expect(schoolPortalHref('Yeshiva')).toBe('/yeshiva/portal');
      locationSpy.mockReturnValue({ ...window.location, host: 'leveluprewards.app' } as Location);
      expect(schoolPortalHref('yeshiva')).toBe('https://leveluprewards.app/yeshiva/portal');
    } finally {
      locationSpy.mockRestore();
      if (previous === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previous;
      }
    }
  });

  it('officeAbsoluteHref does not double-prefix when href is already absolute', () => {
    process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST = 'office.leveluprewards.app';
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'leveluprewards.app',
      origin: 'https://leveluprewards.app',
    } as Location);
    expect(officeAbsoluteHref('yeshiva')).toBe('https://office.leveluprewards.app/yeshiva');
    expect(officeAbsoluteHref('yeshiva')).not.toContain('leveluprewards.app/https');
    locationSpy.mockRestore();
  });
});
