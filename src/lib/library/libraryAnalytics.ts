import type { LibraryItem } from '@/lib/types';
import { resolveBookClassification, type LibraryGenreConfig } from '@/lib/library/libraryClassification';
import { computeDaysOverdue } from '@/lib/library/libraryPolicy';
import { isUnreadLibraryReview } from '@/lib/library/libraryStudentRating';
import {
  libraryCopyNeedsProcessing,
  libraryCopyProcessingReason,
  type LibraryLoan,
} from '@/lib/library/libraryWorkspace';

export const LIBRARY_ANALYTICS_RANGES = [
  { days: 7 as const, label: '7 days' },
  { days: 14 as const, label: '14 days' },
  { days: 30 as const, label: '30 days' },
  { days: null, label: 'All loaded' },
];

export type LibraryAnalyticsRangeDays = 7 | 14 | 30 | null;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function localDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive local-day start for a 7/14/30 day window ending today. */
export function analyticsRangeStart(days: LibraryAnalyticsRangeDays, now = Date.now()): number | null {
  if (days == null) return null;
  return startOfLocalDay(now) - (days - 1) * MS_PER_DAY;
}

export function filterLoansInRange(
  loans: LibraryLoan[],
  days: LibraryAnalyticsRangeDays,
  now = Date.now(),
): LibraryLoan[] {
  const start = analyticsRangeStart(days, now);
  if (start == null) return loans;
  return loans.filter((loan) => loan.checkedOutAt >= start);
}

export function checkoutsByDay(
  loans: LibraryLoan[],
  dayCount: number,
  now = Date.now(),
): { key: string; name: string; count: number }[] {
  const endDay = startOfLocalDay(now);
  const days: { key: string; name: string; count: number }[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const ms = endDay - i * MS_PER_DAY;
    const d = new Date(ms);
    days.push({
      key: localDateKey(ms),
      name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0,
    });
  }
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const loan of loans) {
    if (!loan.checkedOutAt) continue;
    const bucket = byKey.get(localDateKey(loan.checkedOutAt));
    if (bucket) bucket.count += 1;
  }
  return days;
}

function bookTitleKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?(copy|duplicate).*?\)/gi, '')
    .replace(/\s*copy\s*\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function topBorrowedTitles(
  loans: LibraryLoan[],
  limit = 10,
): { itemId: string; title: string; count: number }[] {
  const counts = new Map<string, { itemId: string; title: string; count: number }>();
  for (const loan of loans) {
    const title = (loan.title || '').trim() || 'Untitled';
    const key = bookTitleKey(title) || loan.itemId;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { itemId: loan.itemId, title, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function topBorrowers(
  loans: LibraryLoan[],
  getName: (id?: string) => string,
  getClassName: (id?: string) => string,
  limit = 10,
): { studentId: string; name: string; className: string; count: number }[] {
  const counts = new Map<string, { studentId: string; name: string; className: string; count: number }>();
  for (const loan of loans) {
    const studentId = loan.studentId || '';
    if (!studentId) continue;
    const existing = counts.get(studentId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(studentId, {
        studentId,
        name: getName(studentId),
        className: getClassName(studentId),
        count: 1,
      });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export type CatalogHealth = {
  total: number;
  onShelf: number;
  checkedOut: number;
  overdue: number;
  needsProcessing: number;
  damaged: number;
  cataloged: number;
  catalogedPct: number;
};

export function catalogHealth(items: LibraryItem[], now = Date.now()): CatalogHealth {
  const active = items.filter((item) => !item.archived);
  const checkedOut = active.filter((item) => item.status === 'checked_out');
  const overdue = checkedOut.filter((item) => item.dueAt && computeDaysOverdue(item.dueAt, now) > 0);
  const onShelf = active.filter(
    (item) => item.status === 'available' && (!item.condition || item.condition === 'good'),
  );
  const needsProcessing = active.filter((item) => libraryCopyNeedsProcessing(item));
  const damaged = active.filter((item) => item.condition === 'damaged' || item.condition === 'lost');
  const cataloged = active.filter((item) => item.labeled && item.shelfLocation?.trim());
  const total = active.length;
  return {
    total,
    onShelf: onShelf.length,
    checkedOut: checkedOut.length,
    overdue: overdue.length,
    needsProcessing: needsProcessing.length,
    damaged: damaged.length,
    cataloged: cataloged.length,
    catalogedPct: total > 0 ? Math.round((cataloged.length / total) * 100) : 0,
  };
}

export type OverdueReportRow = {
  itemId: string;
  title: string;
  author: string;
  upc: string;
  studentName: string;
  className: string;
  dueAt: number;
  daysLate: number;
};

export function overdueReportRows(
  items: LibraryItem[],
  getName: (id?: string) => string,
  getClassName: (id?: string) => string,
  now = Date.now(),
): OverdueReportRow[] {
  return items
    .filter((item) => !item.archived && item.status === 'checked_out' && item.dueAt && computeDaysOverdue(item.dueAt, now) > 0)
    .map((item) => ({
      itemId: item.id,
      title: item.name,
      author: item.author || '',
      upc: item.upc || '',
      studentName: getName(item.checkedOutTo ?? undefined),
      className: getClassName(item.checkedOutTo ?? undefined),
      dueAt: item.dueAt as number,
      daysLate: computeDaysOverdue(item.dueAt, now),
    }))
    .sort((a, b) => b.daysLate - a.daysLate || a.title.localeCompare(b.title));
}

export type ProcessingReportRow = {
  itemId: string;
  title: string;
  upc: string;
  reason: string;
};

export function processingReportRows(items: LibraryItem[]): ProcessingReportRow[] {
  return items
    .filter((item) => !item.archived && libraryCopyNeedsProcessing(item))
    .map((item) => ({
      itemId: item.id,
      title: item.name,
      upc: item.upc || '',
      reason: libraryCopyProcessingReason(item),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function averageReturnedLoanDays(loans: LibraryLoan[]): number | null {
  const returned = loans.filter((loan) => loan.returnedAt && loan.checkedOutAt && loan.returnedAt > loan.checkedOutAt);
  if (!returned.length) return null;
  const totalMs = returned.reduce((sum, loan) => sum + ((loan.returnedAt as number) - loan.checkedOutAt), 0);
  return Math.round((totalMs / returned.length / MS_PER_DAY) * 10) / 10;
}

export type ReviewSnapshot = {
  total: number;
  ratedCount: number;
  unreadCount: number;
  average: number | null;
  fiveStar: number;
};

export function reviewSnapshot(
  reviews: Array<{ itemId?: string; rating?: number; didNotRead?: boolean; reviewText?: string }>,
): ReviewSnapshot {
  const unreadCount = reviews.filter((review) => isUnreadLibraryReview(review)).length;
  const rated = reviews.filter((review) => !isUnreadLibraryReview(review) && (review.rating ?? 0) >= 1);
  const average =
    rated.length > 0
      ? Math.round((rated.reduce((sum, review) => sum + (review.rating ?? 0), 0) / rated.length) * 10) / 10
      : null;
  return {
    total: reviews.length,
    ratedCount: rated.length,
    unreadCount,
    average,
    fiveStar: rated.filter((review) => review.rating === 5).length,
  };
}

export function genreCirculation(
  loans: LibraryLoan[],
  items: LibraryItem[],
  genreDefinitions?: LibraryGenreConfig[] | null,
  limit = 8,
): { label: string; color: string; count: number }[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const counts = new Map<string, { label: string; color: string; count: number }>();
  for (const loan of loans) {
    const item = itemsById.get(loan.itemId);
    const classification = resolveBookClassification(item?.category, genreDefinitions, item?.shelfLocation);
    const key = classification.genre.id;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label: classification.genre.label, color: classification.color, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function formatLoanDate(ms?: number | null): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString();
}

export function overdueCsvRows(rows: OverdueReportRow[]): (string | number)[][] {
  return [
    ['Student', 'Class', 'Book', 'Author', 'Barcode', 'Due date', 'Days late'],
    ...rows.map((row) => [row.studentName, row.className, row.title, row.author, row.upc, formatLoanDate(row.dueAt), row.daysLate]),
  ];
}

export function loansCsvRows(
  loans: LibraryLoan[],
  getName: (id?: string) => string,
  getClassName: (id?: string) => string,
): (string | number)[][] {
  return [
    ['Book', 'Student', 'Class', 'Checked out', 'Due', 'Returned', 'Barcode'],
    ...loans.map((loan) => [
      loan.title,
      getName(loan.studentId),
      getClassName(loan.studentId),
      formatLoanDate(loan.checkedOutAt),
      formatLoanDate(loan.dueAt),
      loan.returnedAt ? formatLoanDate(loan.returnedAt) : 'Still out',
      loan.upc,
    ]),
  ];
}

export function topBooksCsvRows(rows: { title: string; count: number }[]): (string | number)[][] {
  return [['Book', 'Checkouts'], ...rows.map((row) => [row.title, row.count])];
}

export function topReadersCsvRows(
  rows: { name: string; className: string; count: number }[],
): (string | number)[][] {
  return [['Student', 'Class', 'Checkouts'], ...rows.map((row) => [row.name, row.className, row.count])];
}

export function processingCsvRows(rows: ProcessingReportRow[]): (string | number)[][] {
  return [['Book', 'Barcode', 'Still needs'], ...rows.map((row) => [row.title, row.upc, row.reason])];
}
