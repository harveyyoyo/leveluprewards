import { describe, expect, it } from 'vitest';
import {
  joinDisplayParts,
  safeFiniteNumber,
  safeNumber,
  safeNumberOr,
  safeString,
  safeTrimString,
} from './safeDisplayValue';

describe('safeDisplayValue', () => {
  describe('safeString', () => {
    it('returns fallback for nullish and non-string values', () => {
      expect(safeString(undefined)).toBe('');
      expect(safeString(null)).toBe('');
      expect(safeString(42)).toBe('');
      expect(safeString(undefined, '—')).toBe('—');
    });

    it('strips legacy system tokens and whitespace', () => {
      expect(safeString('undefined')).toBe('');
      expect(safeString(' null ')).toBe('');
      expect(safeString('NaN')).toBe('');
      expect(safeString('   ')).toBe('');
    });

    it('keeps real display text', () => {
      expect(safeString(' Ada ')).toBe('Ada');
      expect(safeString('Lovelace')).toBe('Lovelace');
    });
  });

  describe('safeTrimString', () => {
    it('matches safeString behavior', () => {
      expect(safeTrimString(' undefined ')).toBe('');
      expect(safeTrimString(' Cohen ')).toBe('Cohen');
    });
  });

  describe('joinDisplayParts', () => {
    it('joins only valid parts', () => {
      expect(joinDisplayParts(['Ada', undefined, 'Lovelace'])).toBe('Ada Lovelace');
      expect(joinDisplayParts(['Nick', 'undefined'])).toBe('Nick');
      expect(joinDisplayParts([undefined, 'undefined'])).toBe('');
    });
  });

  describe('safeNumber', () => {
    it('accepts finite numbers and numeric strings', () => {
      expect(safeNumber(88)).toBe(88);
      expect(safeNumber('92.5')).toBe(92.5);
    });

    it('returns fallback for invalid values', () => {
      expect(safeNumber(undefined, 0)).toBe(0);
      expect(safeNumber('bad', 0)).toBe(0);
      expect(safeNumber(Number.NaN)).toBeUndefined();
    });
  });

  describe('safeNumberOr', () => {
    it('always returns a number', () => {
      expect(safeNumberOr('10', 0)).toBe(10);
      expect(safeNumberOr('bad', 5)).toBe(5);
    });
  });

  describe('safeFiniteNumber', () => {
    it('returns undefined for invalid values', () => {
      expect(safeFiniteNumber(null)).toBeUndefined();
      expect(safeFiniteNumber('undefined')).toBeUndefined();
    });
  });
});
