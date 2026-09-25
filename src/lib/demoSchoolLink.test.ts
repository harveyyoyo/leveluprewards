import { describe, expect, it } from 'vitest';
import { demoLinkForSchoolPage, demoLinkUrl, resolveDemoLinkTarget } from './demoSchoolLink';

describe('resolveDemoLinkTarget', () => {
  it('opens the School ABC portal for a bare /demo link', () => {
    expect(resolveDemoLinkTarget('/demo')).toEqual({
      schoolId: 'schoolabc',
      href: '/schoolabc/portal',
      needsAdmin: false,
    });
    expect(resolveDemoLinkTarget('/demo/')?.href).toBe('/schoolabc/portal');
    expect(resolveDemoLinkTarget('/demo/schoolabc')?.href).toBe('/schoolabc/portal');
  });

  it('opens a page in the default demo school', () => {
    expect(resolveDemoLinkTarget('/demo/library')).toEqual({
      schoolId: 'schoolabc',
      href: '/schoolabc/library',
      needsAdmin: false,
    });
    expect(resolveDemoLinkTarget('/demo/Library/Kiosk')?.href).toBe('/schoolabc/library/kiosk');
  });

  it('opens a named demo school', () => {
    expect(resolveDemoLinkTarget('/demo/yeshiva/library')).toEqual({
      schoolId: 'yeshiva',
      href: '/yeshiva/library',
      needsAdmin: false,
    });
    expect(resolveDemoLinkTarget('/demo/yeshiva')?.href).toBe('/yeshiva/portal');
  });

  it('keeps the link query string but never the key', () => {
    expect(resolveDemoLinkTarget('/demo/library', '?tab=catalog&library=main')?.href).toBe(
      '/schoolabc/library?tab=catalog&library=main',
    );
    expect(resolveDemoLinkTarget('/demo/library', '?key=secret&tab=catalog')?.href).toBe(
      '/schoolabc/library?tab=catalog',
    );
  });

  it('maps tab-based pillars to the same admin tabs as the Welcome tab', () => {
    expect(resolveDemoLinkTarget('/demo/rewards')).toEqual({
      schoolId: 'schoolabc',
      href: '/schoolabc/admin?tab=prizes',
      needsAdmin: true,
    });
    expect(resolveDemoLinkTarget('/demo/yeshiva/attendance')?.href).toBe(
      '/yeshiva/admin?tab=attendance',
    );
    expect(resolveDemoLinkTarget('/demo/rewards', '?tab=coupons')?.href).toBe(
      '/schoolabc/admin?tab=coupons',
    );
  });

  it('asks for the demo admin sign-in only on staff pages', () => {
    expect(resolveDemoLinkTarget('/demo/office')?.needsAdmin).toBe(true);
    expect(resolveDemoLinkTarget('/demo/office/grades')?.needsAdmin).toBe(true);
    expect(resolveDemoLinkTarget('/demo/classroom')?.needsAdmin).toBe(true);
    expect(resolveDemoLinkTarget('/demo/admin')?.needsAdmin).toBe(true);
    expect(resolveDemoLinkTarget('/demo/student')?.needsAdmin).toBe(false);
    expect(resolveDemoLinkTarget('/demo')?.needsAdmin).toBe(false);
  });

  it('never opens a real school or anything outside the demo school', () => {
    expect(resolveDemoLinkTarget('/myschool/library')).toBeNull();
    expect(resolveDemoLinkTarget('/demonstration')).toBeNull();
    expect(resolveDemoLinkTarget('/demo/%2e%2e/admin')).toBeNull();
    expect(resolveDemoLinkTarget('/demo/..')).toBeNull();
    expect(resolveDemoLinkTarget('/demo/library.html')).toBeNull();
    // Unknown first segments are pages in the default demo school, not school ids.
    expect(resolveDemoLinkTarget('/demo/realschool/admin')?.href).toBe(
      '/schoolabc/realschool/admin',
    );
  });

  it('ignores inherited object keys as pillar names', () => {
    expect(resolveDemoLinkTarget('/demo/constructor')?.href).toBe('/schoolabc/constructor');
  });
});

describe('demoLinkUrl', () => {
  const origin = 'https://leveluprewards.app';

  it('builds short links for School ABC and named links for other demo schools', () => {
    expect(demoLinkUrl(origin, 'schoolabc', '', 'K1')).toBe('https://leveluprewards.app/demo?key=K1');
    expect(demoLinkUrl(origin, 'schoolabc', 'library', 'K1')).toBe(
      'https://leveluprewards.app/demo/library?key=K1',
    );
    expect(demoLinkUrl(origin, 'yeshiva', 'library', 'K2', '?tab=catalog')).toBe(
      'https://leveluprewards.app/demo/yeshiva/library?tab=catalog&key=K2',
    );
  });

  it('round-trips through resolveDemoLinkTarget without passing the key to the page', () => {
    const url = new URL(demoLinkUrl(origin, 'yeshiva', 'rewards', 'K2'));
    expect(resolveDemoLinkTarget(url.pathname, url.search)?.href).toBe('/yeshiva/admin?tab=prizes');
    const lib = new URL(demoLinkUrl(origin, 'schoolabc', 'library', 'K1', '?tab=catalog'));
    expect(resolveDemoLinkTarget(lib.pathname, lib.search)?.href).toBe('/schoolabc/library?tab=catalog');
  });
});

describe('demoLinkForSchoolPage', () => {
  const origin = 'https://leveluprewards.app';
  const keys = { schoolabc: 'K1', yeshiva: 'K2' };

  it('turns the demo page being viewed into a share link', () => {
    expect(demoLinkForSchoolPage(origin, '/schoolabc/library', '?tab=catalog', keys)).toBe(
      'https://leveluprewards.app/demo/library?tab=catalog&key=K1',
    );
    expect(demoLinkForSchoolPage(origin, '/yeshiva/office/grades', '', keys)).toBe(
      'https://leveluprewards.app/demo/yeshiva/office/grades?key=K2',
    );
  });

  it('never makes a link for a real school or without a key', () => {
    expect(demoLinkForSchoolPage(origin, '/realschool/library', '', keys)).toBeNull();
    expect(demoLinkForSchoolPage(origin, '/schoolabc/library', '', {})).toBeNull();
  });
});
