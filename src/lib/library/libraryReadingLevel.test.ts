import { describe, expect, it } from 'vitest';
import {
  compareReadingLevel,
  parseReadingLevelGradeEquivalent,
  resolveReadingLevelBand,
} from './libraryReadingLevel';

describe('libraryReadingLevel', () => {
  it('parses Lexile scores', () => {
    expect(parseReadingLevelGradeEquivalent('650L')).toBeCloseTo(650 / 133 - 0.3, 2);
    expect(parseReadingLevelGradeEquivalent('Lexile 400L')).not.toBeNull();
  });

  it('parses Accelerated Reader levels', () => {
    expect(parseReadingLevelGradeEquivalent('AR 4.2')).toBe(4.2);
    expect(parseReadingLevelGradeEquivalent('ATOS: 2.5')).toBe(2.5);
  });

  it('parses grade ranges and single grades', () => {
    expect(parseReadingLevelGradeEquivalent('Grade 3-5')).toBe(4);
    expect(parseReadingLevelGradeEquivalent('Grades K-1')).toBe(0.5);
    expect(parseReadingLevelGradeEquivalent('3rd Grade')).toBe(3);
    expect(parseReadingLevelGradeEquivalent('Grade K')).toBe(0);
  });

  it('parses Fountas & Pinnell letters', () => {
    expect(parseReadingLevelGradeEquivalent('F&P M')).toBe(2.2);
    expect(parseReadingLevelGradeEquivalent('Guided Reading Level A')).toBe(0);
  });

  it('parses a bare number as a grade-equivalent', () => {
    expect(parseReadingLevelGradeEquivalent('4.2')).toBe(4.2);
  });

  it('returns null for empty or unrecognized text', () => {
    expect(parseReadingLevelGradeEquivalent('')).toBeNull();
    expect(parseReadingLevelGradeEquivalent(undefined)).toBeNull();
    expect(parseReadingLevelGradeEquivalent('mystery')).toBeNull();
  });

  it('sorts unrated books last', () => {
    expect(compareReadingLevel('Grade 2', 'Grade 5')).toBeLessThan(0);
    expect(compareReadingLevel(undefined, 'Grade 5')).toBeGreaterThan(0);
    expect(compareReadingLevel('Grade 5', undefined)).toBeLessThan(0);
    expect(compareReadingLevel(null, null)).toBe(0);
  });

  it('resolves a book into the right shelf band', () => {
    expect(resolveReadingLevelBand('Grade K').band.id).toBe('emergent');
    expect(resolveReadingLevelBand('Grade 1').band.id).toBe('early');
    expect(resolveReadingLevelBand('AR 4.2').band.id).toBe('developing');
    expect(resolveReadingLevelBand('Grade 6').band.id).toBe('fluent');
    expect(resolveReadingLevelBand('Grade 8').band.id).toBe('middle_grade');
    expect(resolveReadingLevelBand('Grade 10').band.id).toBe('advanced');
    expect(resolveReadingLevelBand(undefined).band.id).toBe('unrated');
    expect(resolveReadingLevelBand('').value).toBeNull();
  });
});
