import { describe, expect, it } from 'vitest';
import { listStudentLibraryBooksRead, parseLibraryBookTitleFromActivity } from './libraryStudentHistory';

describe('libraryStudentHistory', () => {
  it('parses returned library activity titles', () => {
    expect(parseLibraryBookTitleFromActivity('Returned library item: Charlotte\'s Web')).toBe("Charlotte's Web");
    expect(parseLibraryBookTitleFromActivity('Checked out library item: X')).toBeNull();
  });

  it('lists unique books read with most recent return', () => {
    const reads = listStudentLibraryBooksRead([
      { desc: 'Returned library item: Book A', amount: 0, date: 100 },
      { desc: 'Returned library item: Book B', amount: 0, date: 200 },
      { desc: 'Returned library item: Book A', amount: 0, date: 50 },
      { desc: 'Earned 5 points', amount: 5, date: 300 },
    ]);
    expect(reads).toHaveLength(2);
    expect(reads[0].title).toBe('Book B');
    expect(reads[1].title).toBe('Book A');
    expect(reads[1].returnedAt).toBe(100);
  });
});
