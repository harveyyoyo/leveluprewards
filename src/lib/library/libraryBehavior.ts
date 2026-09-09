import type { LibraryItem } from '@/lib/types';
import { computeDaysOverdue } from './libraryPolicy';

export type LibraryStandingLevel = 'exemplary' | 'good' | 'warning' | 'restricted';

export interface StudentLibraryStanding {
  level: LibraryStandingLevel;
  label: string;
  badgeTone: 'emerald' | 'blue' | 'amber' | 'rose';
  summary: string;
  activeLoanCount: number;
  overdueCount: number;
  maxDaysOverdue: number;
}

export interface LibraryBehaviorTag {
  id: string;
  label: string;
  category: 'commendation' | 'notice';
  icon: string;
  description: string;
}

export const LIBRARY_BEHAVIOR_TAGS: readonly LibraryBehaviorTag[] = [
  {
    id: 'care_champion',
    label: 'Book Care Champion',
    category: 'commendation',
    icon: '✨',
    description: 'Treated books with exceptional care and kept pages in pristine condition.',
  },
  {
    id: 'library_citizen',
    label: 'Helpful Citizen',
    category: 'commendation',
    icon: '🤝',
    description: 'Helped tidy books and assisted fellow students in the library.',
  },
  {
    id: 'avid_reader',
    label: 'Avid Reader',
    category: 'commendation',
    icon: '📚',
    description: 'Consistently explores new topics and reads enthusiastically.',
  },
  {
    id: 'prompt_return',
    label: 'Prompt Returner',
    category: 'commendation',
    icon: '⏱️',
    description: 'Always returns or renews items on time.',
  },
  {
    id: 'overdue_notice',
    label: 'Overdue Notice',
    category: 'notice',
    icon: '⚠️',
    description: 'Book is past the return due date.',
  },
  {
    id: 'page_wear',
    label: 'Page / Cover Wear',
    category: 'notice',
    icon: '🔖',
    description: 'Needs reminder on using bookmarks rather than dog-earing.',
  },
  {
    id: 'missing_barcode',
    label: 'Barcode Wear',
    category: 'notice',
    icon: '🏷️',
    description: 'Book barcode sticker needs replacement.',
  },
] as const;

/**
 * Computes the real-time library standing and reliability rating for a student.
 */
export function computeStudentLibraryStanding(
  activeLoans: LibraryItem[],
  options?: {
    fineBalance?: number;
    now?: number;
  },
): StudentLibraryStanding {
  const now = options?.now ?? Date.now();
  const fine = options?.fineBalance ?? 0;

  let overdueCount = 0;
  let maxDaysOverdue = 0;

  for (const loan of activeLoans) {
    const days = computeDaysOverdue(loan.dueAt, now);
    if (days > 0) {
      overdueCount++;
      if (days > maxDaysOverdue) {
        maxDaysOverdue = days;
      }
    }
  }

  if (overdueCount >= 2 || maxDaysOverdue >= 14 || fine >= 20) {
    return {
      level: 'restricted',
      label: 'Overdue Attention Required',
      badgeTone: 'rose',
      summary: `${overdueCount} overdue books (${maxDaysOverdue} days late). Please return before borrowing more.`,
      activeLoanCount: activeLoans.length,
      overdueCount,
      maxDaysOverdue,
    };
  }

  if (overdueCount === 1 || fine > 0) {
    return {
      level: 'warning',
      label: 'Due Date Reminder',
      badgeTone: 'amber',
      summary: `1 book is ${maxDaysOverdue} day${maxDaysOverdue === 1 ? '' : 's'} overdue. Please return soon.`,
      activeLoanCount: activeLoans.length,
      overdueCount,
      maxDaysOverdue,
    };
  }

  if (activeLoans.length > 0) {
    return {
      level: 'exemplary',
      label: 'Reliable Reader',
      badgeTone: 'emerald',
      summary: 'All borrowed books are in good standing on schedule.',
      activeLoanCount: activeLoans.length,
      overdueCount: 0,
      maxDaysOverdue: 0,
    };
  }

  return {
    level: 'good',
    label: 'Clear Standing',
    badgeTone: 'blue',
    summary: 'No active loans. Ready to borrow books!',
    activeLoanCount: 0,
    overdueCount: 0,
    maxDaysOverdue: 0,
  };
}
