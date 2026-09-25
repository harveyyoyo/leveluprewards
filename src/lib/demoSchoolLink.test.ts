import { describe, expect, it } from 'vitest';
import { demoLinkUrl, resolveDemoLinkTarget } from './demoSchoolLink';

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

  it('keeps the link query string', () => {
    expect(resolveDemoLinkTarget('/demo/library', '?tab=catalog&library=main')?.href).toBe(
      '/schoolabc/library?tab=catalog&library=main',
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
  it('builds short links for School ABC and named links for other demo schools', () => {
    const origin = 'https://leveluprewards.app';
    expect(demoLinkUrl(origin, 'schoolabc')).toBe('https://leveluprewards.app/demo');
    expect(demoLinkUrl(origin, 'schoolabc', 'library')).toBe('https://leveluprewards.app/demo/library');
    expect(demoLinkUrl(origin, 'yeshiva', 'library')).toBe(
      'https://leveluprewards.app/demo/yeshiva/library',
    );
    expect(demoLinkUrl(origin, 'yeshiva')).toBe('https://leveluprewards.app/demo/yeshiva');
  });

  it('round-trips through resolveDemoLinkTarget', () => {
    const url = new URL(demoLinkUrl('https://leveluprewards.app', 'yeshiva', 'rewards'));
    expect(resolveDemoLinkTarget(url.pathname, url.search)?.href).toBe('/yeshiva/admin?tab=prizes');
  });
});
