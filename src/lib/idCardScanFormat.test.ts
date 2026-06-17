import { describe, expect, it } from 'vitest';
import { resolveStudentIdCardUseQr } from './idCardScanFormat';

describe('resolveStudentIdCardUseQr', () => {
  it('uses school default when student theme has no override', () => {
    expect(resolveStudentIdCardUseQr(undefined, false)).toBe(false);
    expect(resolveStudentIdCardUseQr(undefined, true)).toBe(true);
    expect(resolveStudentIdCardUseQr({ idCardUseQr: undefined }, true)).toBe(true);
  });

  it('honors per-student theme override', () => {
    const theme = {
      background: '#000',
      text: '#fff',
      primary: '#0af',
      cardBackground: '#111',
      accent: '#0f0',
      idCardUseQr: false,
    };
    expect(resolveStudentIdCardUseQr(theme, true)).toBe(false);
    expect(resolveStudentIdCardUseQr({ ...theme, idCardUseQr: true }, false)).toBe(true);
  });
});
