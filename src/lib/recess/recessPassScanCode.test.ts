import { describe, expect, it } from 'vitest';
import {
  isRecessPassScanCode,
  parseRecessPassScanCode,
  recessPassScanCodeFor,
} from './recessPassScanCode';

describe('recessPassScanCode', () => {
  it('maps fixed codes per reason', () => {
    expect(recessPassScanCodeFor('bathroom')).toBe('RCBATH');
    expect(recessPassScanCodeFor('break')).toBe('RCBREAK');
    expect(recessPassScanCodeFor('water')).toBe('RCWATER');
  });

  it('parses scanner input with optional wrappers', () => {
    expect(parseRecessPassScanCode('RCBATH')).toBe('bathroom');
    expect(parseRecessPassScanCode('*RC-BREAK*')).toBe('break');
    expect(parseRecessPassScanCode(' rcwater ')).toBe('water');
    expect(parseRecessPassScanCode('COUPON123')).toBeNull();
  });

  it('detects recess pass codes', () => {
    expect(isRecessPassScanCode('RCNURSE')).toBe(true);
    expect(isRecessPassScanCode('PZABCDEF')).toBe(false);
  });
});
