import { describe, expect, it } from 'vitest';
import type { LibraryItem } from '@/lib/types';
import {
  buildLibraryAiHelpContext,
  formatLibraryAiHelpContextBlock,
  parseLibraryAiHelpContext,
  resolveLibraryAiHelpScreen,
} from './libraryHelpContext';

function copy(partial: Partial<LibraryItem> & Pick<LibraryItem, 'id' | 'name'>): LibraryItem {
  return {
    upc: `upc-${partial.id}`,
    status: 'available',
    ...partial,
  };
}

describe('libraryHelpContext', () => {
  it('counts shelf, checkout, and overdue books without student names', () => {
    const ctx = buildLibraryAiHelpContext({
      libraryName: 'Class Library',
      libraryCount: 2,
      copies: [
        copy({ id: 'a', name: 'Charlotte\'s Web', status: 'available', labeled: true, shelfLocation: 'A1' }),
        copy({
          id: 'b',
          name: 'The Hobbit',
          status: 'checked_out',
          checkedOutTo: 'student-secret',
          dueAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          labeled: true,
          shelfLocation: 'B2',
        }),
        copy({ id: 'c', name: 'New Arrival', status: 'available' }),
        copy({ id: 'd', name: 'Torn Copy', status: 'available', condition: 'damaged', labeled: true, shelfLocation: 'C3' }),
      ],
      policy: {
        maxCheckoutsPerStudent: 2,
        loanPeriodDays: 14,
        gracePeriodDays: 1,
        maxRenewals: 2,
      },
      currentScreen: 'desk',
      selfCheckoutEnabled: true,
    });

    expect(ctx.catalogCount).toBe(4);
    expect(ctx.availableCount).toBe(2);
    expect(ctx.checkedOutCount).toBe(1);
    expect(ctx.overdueCount).toBe(1);
    expect(ctx.needsProcessingCount).toBe(1);
    expect(ctx.lostDamagedCount).toBe(1);
    expect(ctx.topOverdueTitles).toEqual(['The Hobbit']);
    expect(ctx.libraryName).toBe('Class Library');

    const block = formatLibraryAiHelpContextBlock(ctx);
    expect(block).toContain('The Hobbit');
    expect(block).not.toContain('student-secret');
    expect(block).toContain('2 books per student');
  });

  it('maps the front door and unknown tabs to safe screens', () => {
    expect(resolveLibraryAiHelpScreen(true, 'catalog')).toBe('hub');
    expect(resolveLibraryAiHelpScreen(false, 'catalog')).toBe('catalog');
    expect(resolveLibraryAiHelpScreen(false, 'mystery')).toBe('desk');
  });

  it('ignores unsafe snapshot fields from the client', () => {
    const parsed = parseLibraryAiHelpContext({
      libraryName: 'Main',
      libraryCount: 1,
      catalogCount: 9,
      availableCount: 4,
      checkedOutCount: 5,
      overdueCount: 2,
      needsProcessingCount: 1,
      lostDamagedCount: 0,
      maxCheckoutsPerStudent: 3,
      loanPeriodDays: 7,
      gracePeriodDays: 0,
      maxRenewals: 1,
      currentScreen: 'catalog',
      selfCheckoutEnabled: true,
      topOverdueTitles: ['Safe Title', { sneak: 'nope' }, 'Another'],
      extraStudentName: 'Should be dropped',
    });

    expect(parsed?.topOverdueTitles).toEqual(['Safe Title', 'Another']);
    expect(parsed?.currentScreen).toBe('catalog');
    expect(parsed && 'extraStudentName' in parsed).toBe(false);
  });
});
