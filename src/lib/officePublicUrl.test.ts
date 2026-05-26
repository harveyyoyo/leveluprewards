import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  officeAbsoluteHref,
  officePortalEntryHref,
  officePortalHandoffHref,
  officePublicHref,
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

  it('uses office subdomain for public links and handoff API for portal entry', () => {
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
