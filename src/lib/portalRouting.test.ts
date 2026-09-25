import { describe, expect, it } from 'vitest';
import {
  browserReachableHost,
  canonicalPortalRedirectUrl,
  isLocalDevHost,
  isPortalHostname,
  portalHostRedirectPath,
  portalHostToCanonicalRedirectUrl,
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
    expect(portalHostRedirectPath('/contact')).toBeNull();
    expect(portalHostRedirectPath('/office-bootstrap')).toBeNull();
    expect(portalHostRedirectPath('/api/health')).toBeNull();
    expect(portalHostRedirectPath('/demo')).toBeNull();
  });

  it('maps bind-all dev hosts to localhost for browsers', () => {
    expect(browserReachableHost('0.0.0.0:8080')).toBe('localhost:8080');
    expect(isLocalDevHost('0.0.0.0:8080')).toBe(true);
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
        canonicalPortalRedirectUrl('/demo/library', '?tab=catalog', 'leveluprewards.app', 'https:')?.toString(),
      ).toBe('https://portal.leveluprewards.app/demo/library?tab=catalog');
      expect(
        canonicalPortalRedirectUrl('/demo', '', 'leveluprewards.app', 'https:')?.toString(),
      ).toBe('https://portal.leveluprewards.app/demo');
      expect(
        canonicalPortalRedirectUrl('/demo/library', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();

      expect(
        canonicalPortalRedirectUrl('/yeshiva/admin', '', 'leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl('/yeshiva/portal', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        portalHostToCanonicalRedirectUrl('/yeshiva', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previous;
      }
    }
  });

  it('keeps old portal-host links as they are until the forward switch is on', () => {
    const previous = process.env.PORTAL_CANONICAL_HOST;
    process.env.PORTAL_CANONICAL_HOST = 'leveluprewards.app';
    try {
      expect(
        portalHostToCanonicalRedirectUrl('/yeshiva', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl('/yeshiva/portal', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl('/login', '', 'portal.leveluprewards.app', 'https:'),
      ).toBeNull();

      // The main site itself no longer bounces sign-in and school pages elsewhere.
      expect(
        canonicalPortalRedirectUrl('/login', '', 'leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        canonicalPortalRedirectUrl('/yeshiva/portal', '', 'leveluprewards.app', 'https:'),
      ).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previous;
      }
    }
  });

  it('with the forward switch on, sends old portal-host links to the same page on the main site', () => {
    const previous = process.env.PORTAL_CANONICAL_HOST;
    const previousForward = process.env.PORTAL_HOST_FORWARD;
    process.env.PORTAL_CANONICAL_HOST = 'leveluprewards.app';
    process.env.PORTAL_HOST_FORWARD = '1';
    try {
      const fromPortalHost = (pathname: string, search = '') =>
        portalHostToCanonicalRedirectUrl(
          pathname,
          search,
          'portal.leveluprewards.app',
          'https:',
        )?.toString();

      expect(fromPortalHost('/')).toBe('https://leveluprewards.app/portal');
      expect(fromPortalHost('/yeshiva')).toBe('https://leveluprewards.app/yeshiva/portal');
      expect(fromPortalHost('/yeshiva/portal', '?tab=print')).toBe(
        'https://leveluprewards.app/yeshiva/portal?tab=print',
      );
      expect(fromPortalHost('/yeshiva/office/teachers')).toBe(
        'https://leveluprewards.app/yeshiva/office/teachers',
      );
      expect(fromPortalHost('/login', '?school=yeshiva')).toBe(
        'https://leveluprewards.app/login?school=yeshiva',
      );
      expect(fromPortalHost('/contact')).toBe('https://leveluprewards.app/contact');

      expect(fromPortalHost('/api/health')).toBeUndefined();
      expect(fromPortalHost('/sw.js')).toBeUndefined();
      expect(
        portalHostToCanonicalRedirectUrl('/yeshiva/portal', '', 'leveluprewards.app', 'https:'),
      ).toBeNull();
      expect(
        portalHostToCanonicalRedirectUrl('/yeshiva', '', 'portal.localhost:3000', 'http:'),
      ).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previous;
      }
      if (previousForward === undefined) {
        delete process.env.PORTAL_HOST_FORWARD;
      } else {
        process.env.PORTAL_HOST_FORWARD = previousForward;
      }
    }
  });
});
