import { afterEach, describe, expect, it } from 'vitest';
import {
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

  it('uses office subdomain for public links and handoff API for portal entry', () => {
    process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST = 'office.leveluprewards.app';
    expect(officePublicHref('Yeshiva')).toBe('https://office.leveluprewards.app/yeshiva');
    expect(officePortalEntryHref('yeshiva')).toBe('https://office.leveluprewards.app/yeshiva');
    expect(officePortalHandoffHref('yeshiva')).toBe(
      '/api/auth/office-handoff/redirect?school=yeshiva',
    );
  });
});
