import { describe, expect, it, vi } from 'vitest';
import { schoolPortalHref } from './sssPublicUrl';

describe('sssPublicUrl', () => {
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
});
