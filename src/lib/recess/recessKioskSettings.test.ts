import { describe, expect, it } from 'vitest';
import {
  isRecessStudentKioskEnabled,
  recessLimitFor,
  recessLimitMinutes,
  recessReasonHasOwnLimit,
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

describe('per-pass time limits', () => {
  const settings = { recessMaxMinutes: 10, recessMaxMinutesByReason: { water: 3, nurse: 20, break: 0 } };

  it('uses a pass’s own limit, else the school-wide one', () => {
    expect(resolveRecessMaxMinutes(settings, 'water')).toBe(3);
    expect(resolveRecessMaxMinutes(settings, 'nurse')).toBe(20);
    expect(resolveRecessMaxMinutes(settings, 'bathroom')).toBe(10);
    expect(resolveRecessMaxMinutes(settings, 'break')).toBe(10); // 0 means "not set"
    expect(resolveRecessMaxMinutes(settings)).toBe(10);
  });

  it('recessLimitMinutes accepts a number or a lookup', () => {
    expect(recessLimitMinutes(7, 'water')).toBe(7);
    expect(recessLimitMinutes(recessLimitFor(settings), 'water')).toBe(3);
    expect(recessReasonHasOwnLimit(settings, 'water')).toBe(true);
    expect(recessReasonHasOwnLimit(settings, 'bathroom')).toBe(false);
  });
});
