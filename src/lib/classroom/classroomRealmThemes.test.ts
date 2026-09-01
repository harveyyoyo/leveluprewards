import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLASSROOM_REALM_THEME,
  resolveClassroomRealmTheme,
} from './classroomRealmThemes';

describe('resolveClassroomRealmTheme', () => {
  it('returns the default chalkboard look when unset', () => {
    expect(resolveClassroomRealmTheme(undefined).id).toBe(DEFAULT_CLASSROOM_REALM_THEME);
    expect(resolveClassroomRealmTheme('').id).toBe('chalkboard');
  });

  it('maps the old aurora look to smartboard', () => {
    expect(resolveClassroomRealmTheme('aurora').id).toBe('smartboard');
  });

  it('resolves known theme ids', () => {
    expect(resolveClassroomRealmTheme('sunrise').label).toBe('Sunrise');
  });
});
