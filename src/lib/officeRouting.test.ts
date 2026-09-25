import { describe, expect, it } from 'vitest';
import {
  canonicalOfficeRedirectUrl,
  isOfficeAppPath,
  isOfficeHostname,
  isOfficeSchoolScopedPath,
  officeHostInternalRewritePath,
  officeHostRedirectPath,
  officeHostToPortalRedirectUrl,
  shouldHideGlobalAppChrome,
} from './officeRouting';

describe('office routing', () => {
  it('recognizes office app paths', () => {
    expect(isOfficeAppPath('/yeshiva/office')).toBe(true);
    expect(isOfficeAppPath('/yeshiva/office/grades')).toBe(true);
    expect(isOfficeAppPath('/yeshiva/portal')).toBe(false);
    expect(isOfficeAppPath('/portal')).toBe(false);
  });

  it('recognizes office-host school paths without /office segment', () => {
    expect(isOfficeSchoolScopedPath('/yeshiva')).toBe(true);
    expect(isOfficeSchoolScopedPath('/yeshiva/grades')).toBe(true);
    expect(isOfficeSchoolScopedPath('/yeshiva/portal')).toBe(false);
    expect(isOfficeSchoolScopedPath('/demo')).toBe(false);
  });

  it('hides global app chrome on office host or /office routes', () => {
    expect(shouldHideGlobalAppChrome('/yeshiva/office', 'app.example.com')).toBe(true);
    expect(shouldHideGlobalAppChrome('/yeshiva', 'office.leveluprewards.app')).toBe(true);
    expect(shouldHideGlobalAppChrome('/yeshiva/grades', 'office.leveluprewards.app')).toBe(true);
    expect(shouldHideGlobalAppChrome('/yeshiva', 'portal.leveluprewards.app')).toBe(false);
    expect(shouldHideGlobalAppChrome('/schoolabc/office', 'leveluprewards.app')).toBe(true);
  });

  it('recognizes office subdomains', () => {
    expect(isOfficeHostname('office.leveluprewards.app')).toBe(true);
    expect(isOfficeHostname('office.localhost:3000')).toBe(true);
    expect(isOfficeHostname('portal.leveluprewards.app')).toBe(false);
  });

  it('routes office host root to the office entry page', () => {
    expect(officeHostRedirectPath('/')).toBe('/office-bootstrap');
    expect(officeHostRedirectPath('/yeshiva')).toBeNull();
    expect(officeHostRedirectPath('/office-bootstrap')).toBeNull();
    expect(officeHostRedirectPath('/yeshiva/portal')).toBe('/yeshiva');
    expect(officeHostRedirectPath('/yeshiva/office')).toBe('/yeshiva');
    expect(officeHostRedirectPath('/yeshiva/office/teachers')).toBe('/yeshiva/teachers');
  });

  it('rewrites public office paths to internal routes', () => {
    expect(officeHostInternalRewritePath('/yeshiva')).toBe('/yeshiva/office');
    expect(officeHostInternalRewritePath('/yeshiva/grades')).toBe('/yeshiva/office/grades');
    expect(officeHostInternalRewritePath('/yeshiva/teachers')).toBe('/yeshiva/office/teachers');
    expect(officeHostInternalRewritePath('/yeshiva/office/grades')).toBeNull();
  });

  it('redirects legacy /school/office paths to office host when subdomain is configured', () => {
    const previous = process.env.OFFICE_CANONICAL_HOST;
    process.env.OFFICE_CANONICAL_HOST = 'office.leveluprewards.app';
    try {
      expect(
        canonicalOfficeRedirectUrl(
          '/yeshiva/office/grades',
          '',
          'portal.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://office.leveluprewards.app/yeshiva/grades');
      expect(
        canonicalOfficeRedirectUrl(
          '/schoolabc/office',
          '',
          'leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://office.leveluprewards.app/schoolabc');
    } finally {
      if (previous === undefined) {
        delete process.env.OFFICE_CANONICAL_HOST;
      } else {
        process.env.OFFICE_CANONICAL_HOST = previous;
      }
    }
  });

  it('redirects legacy office subdomain hits to portal with /office paths', () => {
    const previousPortal = process.env.PORTAL_CANONICAL_HOST;
    process.env.PORTAL_CANONICAL_HOST = 'portal.leveluprewards.app';
    try {
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/teachers',
          '',
          'office.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://portal.leveluprewards.app/yeshiva/office/teachers');
      expect(
        officeHostToPortalRedirectUrl('/yeshiva', '', 'office.leveluprewards.app', 'https:')
          ?.toString(),
      ).toBe('https://portal.leveluprewards.app/yeshiva/office');
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/office/teachers',
          '',
          'office.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://portal.leveluprewards.app/yeshiva/office/teachers');
      expect(
        officeHostToPortalRedirectUrl('/', '', 'office.leveluprewards.app', 'https:')?.toString(),
      ).toBe('https://portal.leveluprewards.app/login');
      expect(
        officeHostToPortalRedirectUrl(
          '/login',
          '?school=yeshiva',
          'office.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://portal.leveluprewards.app/login?school=yeshiva');
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/teachers',
          '',
          'portal.leveluprewards.app',
          'https:',
        ),
      ).toBeNull();
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/teachers',
          '',
          'office.localhost:3000',
          'http:',
        ),
      ).toBeNull();
    } finally {
      if (previousPortal === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previousPortal;
      }
    }
  });

  it('derives portal host from office host when PORTAL_CANONICAL_HOST is unset', () => {
    const previousPortal = process.env.PORTAL_CANONICAL_HOST;
    const previousPublic = process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST;
    delete process.env.PORTAL_CANONICAL_HOST;
    delete process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST;
    try {
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/teachers',
          '',
          'office.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://portal.leveluprewards.app/yeshiva/office/teachers');
    } finally {
      if (previousPortal === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previousPortal;
      }
      if (previousPublic === undefined) {
        delete process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST;
      } else {
        process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST = previousPublic;
      }
    }
  });

  it('keeps office links on the old portal host until the forward switch is on', () => {
    const previousPortal = process.env.PORTAL_CANONICAL_HOST;
    const previousForward = process.env.PORTAL_HOST_FORWARD;
    process.env.PORTAL_CANONICAL_HOST = 'leveluprewards.app';
    delete process.env.PORTAL_HOST_FORWARD;
    try {
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/teachers',
          '',
          'office.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://portal.leveluprewards.app/yeshiva/office/teachers');

      process.env.PORTAL_HOST_FORWARD = '1';
      expect(
        officeHostToPortalRedirectUrl(
          '/yeshiva/teachers',
          '',
          'office.leveluprewards.app',
          'https:',
        )?.toString(),
      ).toBe('https://leveluprewards.app/yeshiva/office/teachers');
    } finally {
      if (previousPortal === undefined) {
        delete process.env.PORTAL_CANONICAL_HOST;
      } else {
        process.env.PORTAL_CANONICAL_HOST = previousPortal;
      }
      if (previousForward === undefined) {
        delete process.env.PORTAL_HOST_FORWARD;
      } else {
        process.env.PORTAL_HOST_FORWARD = previousForward;
      }
    }
  });

  it('serves /school/office on the main site when subdomain is not configured', () => {
    const previousOffice = process.env.OFFICE_CANONICAL_HOST;
    const previousPublic = process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST;
    delete process.env.OFFICE_CANONICAL_HOST;
    delete process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST;
    try {
      expect(
        canonicalOfficeRedirectUrl(
          '/yeshiva/office/grades',
          '',
          'portal.leveluprewards.app',
          'https:',
        ),
      ).toBeNull();
      expect(
        canonicalOfficeRedirectUrl(
          '/schoolabc/office',
          '',
          'leveluprewards.app',
          'https:',
        ),
      ).toBeNull();
    } finally {
      if (previousOffice === undefined) {
        delete process.env.OFFICE_CANONICAL_HOST;
      } else {
        process.env.OFFICE_CANONICAL_HOST = previousOffice;
      }
      if (previousPublic === undefined) {
        delete process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST;
      } else {
        process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST = previousPublic;
      }
    }
  });
});
