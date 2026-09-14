import { describe, expect, it } from 'vitest';
import { headerProductHref } from './headerProductLinks';

describe('headerProductHref', () => {
  it('returns empty when the school id is missing', () => {
    expect(headerProductHref('library', '   ', 'admin')).toBe('');
  });

  it('sends rewards to the signed-in staff prizes tab', () => {
    expect(headerProductHref('rewards', 'Yeshiva', 'admin')).toBe('/yeshiva/admin?tab=prizes');
    expect(headerProductHref('rewards', 'yeshiva', 'teacher')).toBe('/yeshiva/teacher?tab=prizes');
    expect(headerProductHref('rewards', 'yeshiva', 'secretary')).toBe('/yeshiva/secretary');
    expect(headerProductHref('rewards', 'yeshiva', 'student')).toBe('/yeshiva/student');
    expect(headerProductHref('rewards', 'yeshiva', 'school')).toBe('/yeshiva/portal');
  });

  it('opens dedicated classroom and library pages', () => {
    expect(headerProductHref('classroom', 'yeshiva', 'teacher')).toBe('/yeshiva/classroom-realm');
    expect(headerProductHref('library', 'yeshiva', 'librarian')).toBe('/yeshiva/librarian');
    expect(headerProductHref('library', 'yeshiva', 'teacher')).toBe('/yeshiva/library');
    expect(headerProductHref('library', 'yeshiva', 'secretary')).toBe('/yeshiva/library');
  });

  it('sends admins to the Library tab instead of straight into one library', () => {
    expect(headerProductHref('library', 'yeshiva', 'admin')).toBe('/yeshiva/admin?tab=library');
    expect(headerProductHref('library', 'yeshiva', 'developer')).toBe('/yeshiva/admin?tab=library');
    // Restricted dashboards have no Library tab, so they keep the direct link.
    expect(headerProductHref('library', 'yeshiva', 'prizeClerk')).toBe('/yeshiva/library');
    expect(headerProductHref('library', 'yeshiva', 'houseCoordinator')).toBe('/yeshiva/library');
  });

  it('opens attendance and homework in the matching staff portal', () => {
    expect(headerProductHref('attendance', 'yeshiva', 'admin')).toBe('/yeshiva/admin?tab=attendance');
    expect(headerProductHref('attendance', 'yeshiva', 'teacher')).toBe(
      '/yeshiva/teacher?tab=attendance',
    );
    expect(headerProductHref('homework', 'yeshiva', 'admin')).toBe('/yeshiva/teacher?tab=homework');
  });
});
