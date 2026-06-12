import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  consumeSchoolLoginOfficeIntent,
  markSchoolLoginOfficeIntent,
  resolveSchoolLoginNextUrl,
  schoolLoginNextPath,
  schoolLoginRedirectHref,
} from './schoolLoginRedirect';

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
      'https://portal.leveluprewards.app/login?school=yeshiva&next=https%3A%2F%2Foffice.leveluprewards.app%2Fyeshiva&office=1',
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

  it('tracks office login intent for post-login return', () => {
    sessionStorage.clear();
    markSchoolLoginOfficeIntent('ytt');
    expect(consumeSchoolLoginOfficeIntent('ytt')).toBe(true);
    expect(consumeSchoolLoginOfficeIntent('ytt')).toBe(false);
  });

  it('returns office after login when next is rejected but office intent is set', () => {
    vi.stubEnv('NEXT_PUBLIC_OFFICE_CANONICAL_HOST', 'office.leveluprewards.app');
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      pathname: '/login',
    } as Location);

    expect(
      resolveSchoolLoginNextUrl('ytt', {
        search: '?school=ytt&next=https%3A%2F%2Fevil.com%2Fytt&office=1',
      }),
    ).toBe('https://office.leveluprewards.app/ytt');
  });

  it('falls back to office when next param is missing but office=1 is present', () => {
    vi.stubEnv('NEXT_PUBLIC_OFFICE_CANONICAL_HOST', 'office.leveluprewards.app');
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      pathname: '/login',
    } as Location);

    expect(
      resolveSchoolLoginNextUrl('yeshiva', {
        search: '?school=yeshiva&office=1',
      }),
    ).toBe('https://office.leveluprewards.app/yeshiva');
  });
});
