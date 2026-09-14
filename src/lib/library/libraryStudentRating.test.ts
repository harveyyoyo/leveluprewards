import { describe, expect, it } from 'vitest';
import {
  isUnreadLibraryReview,
  shouldAskStudentToRateReturnedBook,
} from './libraryStudentRating';

describe('shouldAskStudentToRateReturnedBook', () => {
  it('asks a student who just returned a book', () => {
    expect(
      shouldAskStudentToRateReturnedBook({
        actor: 'student',
        studentId: 'stu-1',
        itemId: 'book-1',
      }),
    ).toBe(true);
  });

  it('does not ask a librarian', () => {
    expect(
      shouldAskStudentToRateReturnedBook({
        actor: 'librarian',
        studentId: 'stu-1',
        itemId: 'book-1',
      }),
    ).toBe(false);
  });

  it('does not ask when the student is unknown', () => {
    expect(
      shouldAskStudentToRateReturnedBook({
        actor: 'student',
        studentId: null,
        itemId: 'book-1',
      }),
    ).toBe(false);
  });

  it('does not ask again if they already rated that book', () => {
    expect(
      shouldAskStudentToRateReturnedBook({
        actor: 'student',
        studentId: 'stu-1',
        itemId: 'book-1',
        alreadyRatedItemIds: ['book-1'],
      }),
    ).toBe(false);
  });

  it('does not ask when student ratings are turned off', () => {
    expect(
      shouldAskStudentToRateReturnedBook({
        actor: 'student',
        studentId: 'stu-1',
        itemId: 'book-1',
        enabled: false,
      }),
    ).toBe(false);
  });
});

describe('isUnreadLibraryReview', () => {
  it('detects the did-not-read choice', () => {
    expect(isUnreadLibraryReview({ didNotRead: true, rating: 0 })).toBe(true);
    expect(isUnreadLibraryReview({ rating: 5 })).toBe(false);
  });
});
