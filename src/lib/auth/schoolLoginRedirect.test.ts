import { afterEach, describe, expect, it, vi } from 'vitest';
import { schoolLoginNextPath, schoolLoginRedirectHref } from './schoolLoginRedirect';

describe('schoolLoginRedirect', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uses absolute office URL for next when on office host', () => {
    vi.stubEnv('NEXT_PUBLIC_OFFICE_CANONICAL_HOST', 'office.leveluprewards.app');
    vi.stubEnv('NEXT_PUBLIC_PORTAL_CANONICAL_HOST', 'portal.leveluprewards.app');
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'office.leveluprewards.app',
      pathname: '/yeshiva',
    } as Location);

    expect(schoolLoginNextPath('yeshiva', '/yeshiva')).toBe(
      'https://office.leveluprewards.app/yeshiva',
    );
    expect(schoolLoginRedirectHref('yeshiva', { pathname: '/yeshiva' })).toBe(
      'https://portal.leveluprewards.app/login?school=yeshiva&next=https%3A%2F%2Foffice.leveluprewards.app%2Fyeshiva',
    );
  });

  it('preserves office segment in next on office host', () => {
    vi.stubEnv('NEXT_PUBLIC_OFFICE_CANONICAL_HOST', 'office.leveluprewards.app');
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'office.leveluprewards.app',
      pathname: '/yeshiva/grades',
    } as Location);

    expect(schoolLoginNextPath('yeshiva', '/yeshiva/grades')).toBe(
      'https://office.leveluprewards.app/yeshiva/grades',
    );
  });

  it('uses legacy office path on main host', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'leveluprewards.app',
      pathname: '/yeshiva/office/billing',
    } as Location);

    expect(schoolLoginNextPath('yeshiva', '/yeshiva/office/billing')).toBe('/yeshiva/office/billing');
  });

  it('uses relative portal next for non-office routes', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      pathname: '/yeshiva/teacher',
    } as Location);

    expect(schoolLoginNextPath('yeshiva', '/yeshiva/teacher')).toBe('/yeshiva/teacher');
  });
});
