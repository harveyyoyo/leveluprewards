import { describe, expect, it } from 'vitest';
import {
  canonicalPortalRedirectUrl,
  isLocalDevHost,
  isPortalHostname,
  portalHostRedirectPath,
} from './portalRouting';

describe('portal routing', () => {
  it('recognizes portal subdomains', () => {
    expect(isPortalHostname('portal.leveluprewards.app')).toBe(true);
    expect(isPortalHostname('portal.leveluprewards.app:443')).toBe(true);
    expect(isPortalHostname('portal.localhost:3000')).toBe(true);
    expect(isPortalHostname('app.leveluprewards.app')).toBe(false);
  });

  it('routes portal host root to the portal entry page', () => {
    expect(portalHostRedirectPath('/')).toBe('/portal');
  });

  it('supports short school links on the portal host', () => {
    expect(portalHostRedirectPath('/schoolabc')).toBe('/schoolabc/portal');
    expect(portalHostRedirectPath('/Portal/SchoolABC')).toBe('/schoolabc/portal');
  });

  it('leaves full app and reserved routes alone', () => {
    expect(portalHostRedirectPath('/schoolabc/portal')).toBeNull();
    expect(portalHostRedirectPath('/portal')).toBeNull();
    expect(portalHostRedirectPath('/login')).toBeNull();
    expect(portalHostRedirectPath('/api/health')).toBeNull();
  });

  it('does not canonicalize localhost away to production', () => {
    const previous = process.env.PORTAL_CANONICAL_HOST;
    process.env.PORTAL_CANONICAL_HOST = 'portal.leveluprewards.app';
    try {
      expect(isLocalDevHost('localhost:3000')).toBe(true);
      expect(isLocalDevHost('127.0.0.1:3000')).toBe(true);
      expect(isLocalDevHost('portal.localhost:3000')).toBe(true);
      expect(isLocalDevHost('moier-leady-susanne.ngrok-free.dev')).toBe(true);
      expect(isLocalDevHost('supervisors-innovations-sperm-shares.trycloudflare.com')).toBe(true);
      expect(
        canonicalPortalRedirectUrl('/login', '', 'localhost:3000', 'http:'),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl(
          '/login',
          '',
          'moier-leady-susanne.ngrok-free.dev',
          'https:',
        ),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl(
          '/login',
          '',
          'supervisors-innovations-sperm-shares.trycloudflare.com',
          'https:',
        ),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl('/portal', '', '127.0.0.1:3000', 'http:'),
      ).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previous;
      }
    }
  });

  it('canonicalizes portal entry points when a canonical host is configured', () => {
    const previous = process.env.PORTAL_CANONICAL_HOST;
    process.env.PORTAL_CANONICAL_HOST = 'portal.leveluprewards.app';
    try {
      expect(
        canonicalPortalRedirectUrl(
          '/yeshiva/portal',
          '?tab=print',
          'leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://portal.leveluprewards.app/yeshiva/portal?tab=print');

      expect(
        canonicalPortalRedirectUrl('/portal', '', 'leveluprewards.app', 'https:')?.toString(),
      ).toBe('https://portal.leveluprewards.app/portal');

      expect(
        canonicalPortalRedirectUrl('/login', '?school=yeshiva', 'leveluprewards.app', 'https:')?.toString(),
      ).toBe('https://portal.leveluprewards.app/login?school=yeshiva');

      expect(
        canonicalPortalRedirectUrl('/yeshiva/admin', '', 'leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl('/yeshiva/portal', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previous;
      }
    }
  });
});
