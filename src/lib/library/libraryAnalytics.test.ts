import { describe, expect, it } from 'vitest';
import type { LibraryItem } from '@/lib/types';
import type { LibraryLoan } from '@/lib/library/libraryWorkspace';
import {
  analyticsRangeStart,
  averageReturnedLoanDays,
  catalogHealth,
  checkoutsByDay,
  filterLoansInRange,
  overdueReportRows,
  processingReportRows,
  reviewSnapshot,
  topBorrowedTitles,
  topBorrowers,
} from './libraryAnalytics';

const NOW = Date.parse('2026-09-14T15:00:00-04:00');
const DAY = 24 * 60 * 60 * 1000;

function loan(partial: Partial<LibraryLoan> & Pick<LibraryLoan, 'id' | 'itemId' | 'studentId' | 'title'>): LibraryLoan {
  return {
    upc: 'LIB1',
    checkedOutAt: NOW,
    dueAt: NOW + 14 * DAY,
    ...partial,
  };
}

describe('libraryAnalytics', () => {
  it('keeps a 7-day window on local days including today', () => {
    const start = analyticsRangeStart(7, NOW) as number;
    const todayMorning = Date.parse('2026-09-14T08:00:00-04:00');
    const sevenDaysAgoMorning = Date.parse('2026-09-08T08:00:00-04:00');
    const eightDaysAgo = Date.parse('2026-09-07T18:00:00-04:00');
    expect(todayMorning).toBeGreaterThanOrEqual(start);
    expect(sevenDaysAgoMorning).toBeGreaterThanOrEqual(start);
    expect(eightDaysAgo).toBeLessThan(start);
  });

  it('filters checkouts to the chosen window', () => {
    const loans = [
      loan({ id: 'a', itemId: '1', studentId: 's1', title: 'A', checkedOutAt: Date.parse('2026-09-14T10:00:00-04:00') }),
      loan({ id: 'b', itemId: '2', studentId: 's2', title: 'B', checkedOutAt: Date.parse('2026-09-07T10:00:00-04:00') }),
    ];
    expect(filterLoansInRange(loans, 7, NOW).map((row) => row.id)).toEqual(['a']);
    expect(filterLoansInRange(loans, null, NOW)).toHaveLength(2);
  });

  it('buckets checkouts by local day', () => {
    const loans = [
      loan({ id: 'a', itemId: '1', studentId: 's1', title: 'A', checkedOutAt: Date.parse('2026-09-14T10:00:00-04:00') }),
      loan({ id: 'b', itemId: '1', studentId: 's2', title: 'A', checkedOutAt: Date.parse('2026-09-14T18:00:00-04:00') }),
      loan({ id: 'c', itemId: '2', studentId: 's3', title: 'B', checkedOutAt: Date.parse('2026-09-13T09:00:00-04:00') }),
    ];
    const days = checkoutsByDay(loans, 3, NOW);
    expect(days).toHaveLength(3);
    expect(days[2].count).toBe(2);
    expect(days[1].count).toBe(1);
    expect(days[0].count).toBe(0);
  });

  it('ranks popular titles and readers', () => {
    const loans = [
      loan({ id: '1', itemId: 'book-a', studentId: 'sam', title: 'Sam Book' }),
      loan({ id: '2', itemId: 'book-a', studentId: 'sam', title: 'Sam Book' }),
      loan({ id: '3', itemId: 'book-b', studentId: 'lee', title: 'Lee Book' }),
      loan({ id: '4', itemId: 'book-a-copy', studentId: 'sam', title: 'Sam Book' }),
    ];
    expect(topBorrowedTitles(loans, 5)[0]).toMatchObject({ title: 'Sam Book', count: 3 });
    const readers = topBorrowers(loans, (id) => (id === 'sam' ? 'Sam' : 'Lee'), () => 'Room 1', 5);
    expect(readers[0]).toMatchObject({ studentId: 'sam', name: 'Sam', count: 3 });
  });

  it('summarizes the collection and overdue copies', () => {
    const items: LibraryItem[] = [
      { id: '1', name: 'On shelf', upc: 'A', status: 'available', labeled: true, shelfLocation: 'F-1' },
      {
        id: '2',
        name: 'Late book',
        upc: 'B',
        status: 'checked_out',
        checkedOutTo: 'stu-1',
        dueAt: NOW - 3 * DAY,
        labeled: true,
        shelfLocation: 'F-2',
      },
      { id: '3', name: 'No sticker', upc: 'C', status: 'available', labeled: false },
      { id: '4', name: 'Old', upc: 'D', status: 'available', archived: true, labeled: true, shelfLocation: 'X' },
    ];
    const health = catalogHealth(items, NOW);
    expect(health.total).toBe(3);
    expect(health.checkedOut).toBe(1);
    expect(health.overdue).toBe(1);
    expect(health.needsProcessing).toBe(1);
    expect(health.cataloged).toBe(2);

    const overdue = overdueReportRows(items, () => 'Maya', () => '3rd', NOW);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe('Late book');
    expect(overdue[0].daysLate).toBe(3);

    expect(processingReportRows(items)[0].title).toBe('No sticker');
  });

  it('averages returned loan length and student ratings', () => {
    expect(
      averageReturnedLoanDays([
        loan({
          id: '1',
          itemId: 'a',
          studentId: 's',
          title: 'A',
          checkedOutAt: NOW - 10 * DAY,
          returnedAt: NOW - 3 * DAY,
        }),
      ]),
    ).toBe(7);

    const snap = reviewSnapshot([
      { rating: 5 },
      { rating: 3 },
      { rating: 0, didNotRead: true },
    ]);
    expect(snap.ratedCount).toBe(2);
    expect(snap.unreadCount).toBe(1);
    expect(snap.average).toBe(4);
    expect(snap.fiveStar).toBe(1);
  });
});
