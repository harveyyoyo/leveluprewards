import { describe, expect, it } from 'vitest';
import type { LibraryItem } from '@/lib/types';
import { computeStudentLibraryStanding, LIBRARY_BEHAVIOR_TAGS } from './libraryBehavior';

const DAY = 86_400_000;
const baseNow = 1_700_000_000_000;

describe('libraryBehavior', () => {
  it('returns good standing when student has no active loans', () => {
    const standing = computeStudentLibraryStanding([], { now: baseNow });
    expect(standing.level).toBe('good');
    expect(standing.overdueCount).toBe(0);
    expect(standing.badgeTone).toBe('blue');
  });

  it('returns exemplary when student has active loans that are all on schedule', () => {
    const loans: LibraryItem[] = [
      {
        id: 'l1',
        name: 'Great Book',
        upc: 'UPC1',
        status: 'checked_out',
        dueAt: baseNow + 7 * DAY,
      },
    ];
    const standing = computeStudentLibraryStanding(loans, { now: baseNow });
    expect(standing.level).toBe('exemplary');
    expect(standing.overdueCount).toBe(0);
    expect(standing.badgeTone).toBe('emerald');
  });

  it('returns warning when 1 book is slightly overdue', () => {
    const loans: LibraryItem[] = [
      {
        id: 'l1',
        name: 'Late Book',
        upc: 'UPC1',
        status: 'checked_out',
        dueAt: baseNow - 2 * DAY,
      },
    ];
    const standing = computeStudentLibraryStanding(loans, { now: baseNow });
    expect(standing.level).toBe('warning');
    expect(standing.overdueCount).toBe(1);
    expect(standing.badgeTone).toBe('amber');
    expect(standing.maxDaysOverdue).toBe(2);
  });

  it('returns restricted when multiple books are overdue or severely late', () => {
    const loans: LibraryItem[] = [
      {
        id: 'l1',
        name: 'Late Book 1',
        upc: 'UPC1',
        status: 'checked_out',
        dueAt: baseNow - 5 * DAY,
      },
      {
        id: 'l2',
        name: 'Late Book 2',
        upc: 'UPC2',
        status: 'checked_out',
        dueAt: baseNow - 3 * DAY,
      },
    ];
    const standing = computeStudentLibraryStanding(loans, { now: baseNow });
    expect(standing.level).toBe('restricted');
    expect(standing.overdueCount).toBe(2);
    expect(standing.badgeTone).toBe('rose');
  });

  it('has valid behavior presets with commendations and notices', () => {
    expect(LIBRARY_BEHAVIOR_TAGS.length).toBeGreaterThan(3);
    const commendations = LIBRARY_BEHAVIOR_TAGS.filter((t) => t.category === 'commendation');
    const notices = LIBRARY_BEHAVIOR_TAGS.filter((t) => t.category === 'notice');
    expect(commendations.length).toBeGreaterThan(0);
    expect(notices.length).toBeGreaterThan(0);
  });
});
