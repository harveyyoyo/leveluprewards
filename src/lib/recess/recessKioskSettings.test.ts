import { describe, expect, it } from 'vitest';
import {
  isRecessStudentKioskEnabled,
  resolveRecessMaxMinutes,
} from './recessKioskSettings';

describe('recessKioskSettings', () => {
  it('kiosk checkout is on when recess is on unless explicitly disabled', () => {
    expect(isRecessStudentKioskEnabled({ enableRecess: false })).toBe(false);
    expect(isRecessStudentKioskEnabled({ enableRecess: true })).toBe(true);
    expect(isRecessStudentKioskEnabled({})).toBe(true);
    expect(
      isRecessStudentKioskEnabled({ enableRecess: true, recessStudentKioskEnabled: false }),
    ).toBe(false);
  });

  it('resolveRecessMaxMinutes falls back to 10', () => {
    expect(resolveRecessMaxMinutes({})).toBe(10);
    expect(resolveRecessMaxMinutes({ recessMaxMinutes: 15 })).toBe(15);
    expect(resolveRecessMaxMinutes({ recessMaxMinutes: 0 })).toBe(10);
  });
});
