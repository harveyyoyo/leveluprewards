import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  consumeSchoolLoginOfficeIntent,
  markSchoolLoginOfficeIntent,
  resolveSchoolLoginNextUrl,
  retargetLibraryLoginPath,
  schoolLoginNextPath,
  schoolLoginPageStateFromSearch,
  schoolLoginRedirectHref,
} from './schoolLoginRedirect';

describe('schoolLoginRedirect', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    sessionStorage.clear();
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

  it('preserves the transportation segment when signing in from the office host', () => {
    vi.stubEnv('NEXT_PUBLIC_OFFICE_CANONICAL_HOST', 'office.leveluprewards.app');
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'office.leveluprewards.app',
      pathname: '/yeshiva/transportation',
    } as Location);

    expect(schoolLoginNextPath('yeshiva', '/yeshiva/transportation')).toBe(
      'https://office.leveluprewards.app/yeshiva/transportation',
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

  it('leaves the school box blank on the shareable library sign-in link', () => {
    expect(schoolLoginPageStateFromSearch('?library=1')).toEqual({
      school: '',
      blankSchoolBox: true,
      libraryIntent: true,
    });
    expect(schoolLoginPageStateFromSearch('?school=yeshiva&library=1')).toEqual({
      school: '',
      blankSchoolBox: true,
      libraryIntent: true,
    });
    expect(schoolLoginPageStateFromSearch('?school=yeshiva')).toEqual({
      school: 'yeshiva',
      blankSchoolBox: false,
      libraryIntent: false,
    });
  });

  it('opens the typed school library after library sign-in, even if the old school name is in next', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      pathname: '/login',
    } as Location);

    expect(
      resolveSchoolLoginNextUrl('schoolabc', {
        search: '?library=1',
      }),
    ).toBe('/schoolabc/library');

    expect(
      resolveSchoolLoginNextUrl('schoolabc', {
        search: '?school=yeshiva&next=%2Fyeshiva%2Flibrary',
      }),
    ).toBe('/schoolabc/library');

    expect(
      resolveSchoolLoginNextUrl('schoolabc', {
        search: '?next=%2Fyeshiva%2Flibrary%2Fkiosk&library=1',
      }),
    ).toBe('/schoolabc/library/kiosk');
  });

  it('sends library page visitors to a blank library sign-in, not a filled school portal login', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      pathname: '/yeshiva/library',
    } as Location);

    expect(schoolLoginRedirectHref('yeshiva', { pathname: '/yeshiva/library' })).toBe(
      '/login?changeSchool=1&library=1&next=%2Fyeshiva%2Flibrary',
    );
    expect(
      schoolLoginRedirectHref('yeshiva', { pathname: '/yeshiva/library/kiosk' }),
    ).toBe('/login?changeSchool=1&library=1&next=%2Fyeshiva%2Flibrary%2Fkiosk');
  });

  it('rewrites a library next path onto the school that was typed', () => {
    expect(retargetLibraryLoginPath('/yeshiva/library', 'schoolabc')).toBe('/schoolabc/library');
    expect(retargetLibraryLoginPath('/yeshiva/library?tab=catalog', 'schoolabc')).toBe(
      '/schoolabc/library?tab=catalog',
    );
    expect(retargetLibraryLoginPath('/yeshiva/teacher', 'schoolabc')).toBeNull();
  });

  it('does not send a mismatched teacher next path to the library', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      host: 'portal.leveluprewards.app',
      pathname: '/login',
    } as Location);

    expect(
      resolveSchoolLoginNextUrl('schoolabc', {
        search: '?next=%2Fyeshiva%2Fteacher',
      }),
    ).toBe('/schoolabc/portal');
  });
});
