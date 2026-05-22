import { describe, expect, it } from 'vitest';
import {
  canonicalOfficeRedirectUrl,
  isOfficeAppPath,
  isOfficeHostname,
  isOfficeSchoolScopedPath,
  officeHostInternalRewritePath,
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

  it('rewrites public office paths to internal routes', () => {
    expect(officeHostInternalRewritePath('/yeshiva')).toBe('/yeshiva/office');
    expect(officeHostInternalRewritePath('/yeshiva/grades')).toBe('/yeshiva/office/grades');
    expect(officeHostInternalRewritePath('/yeshiva/office/grades')).toBeNull();
  });

  it('redirects legacy /school/office paths to office host', () => {
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
    } finally {
      if (previous === undefined) {
        delete process.env.OFFICE_CANONICAL_HOST;
      } else {
        process.env.OFFICE_CANONICAL_HOST = previous;
      }
    }
  });
});
