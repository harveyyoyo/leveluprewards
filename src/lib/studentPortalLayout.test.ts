import { describe, expect, it } from 'vitest';
import {
  isStudentPortalPortraitDisplay,
  studentPortalContentClass,
  studentPortalPageShellClass,
} from './studentPortalLayout';

describe('studentPortalLayout', () => {
  it('isStudentPortalPortraitDisplay is true only when setting is on', () => {
    expect(isStudentPortalPortraitDisplay(undefined)).toBe(false);
    expect(isStudentPortalPortraitDisplay({})).toBe(false);
    expect(isStudentPortalPortraitDisplay({ studentPortalPortraitDisplay: false })).toBe(false);
    expect(isStudentPortalPortraitDisplay({ studentPortalPortraitDisplay: true })).toBe(true);
  });

  it('portrait classes use narrower layout tokens', () => {
    expect(studentPortalPageShellClass(true)).toContain('min-h-dvh');
    expect(studentPortalPageShellClass(false)).toContain('justify-center');
    expect(studentPortalContentClass(true)).toContain('max-w-md');
    expect(studentPortalContentClass(false)).toContain('max-w-3xl');
  });
});
