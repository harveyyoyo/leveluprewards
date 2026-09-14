export const DID_NOT_READ_NOTE = "I didn't get a chance to read it";

export function isUnreadLibraryReview(review: {
  rating?: number;
  didNotRead?: boolean;
  reviewText?: string;
}): boolean {
  if (review.didNotRead === true) return true;
  if (review.rating === 0) return true;
  return (review.reviewText || '').includes(DID_NOT_READ_NOTE);
}

/**
 * Students rate books after they return them. Librarians checking a book
 * back in at the desk should not be asked.
 */
export function shouldAskStudentToRateReturnedBook({
  actor,
  studentId,
  itemId,
  alreadyRatedItemIds = [],
  enabled = true,
}: {
  actor: 'student' | 'librarian';
  studentId?: string | null;
  itemId?: string | null;
  alreadyRatedItemIds?: string[];
  enabled?: boolean;
}): boolean {
  if (enabled === false) return false;
  if (actor !== 'student') return false;
  const who = studentId?.trim();
  const book = itemId?.trim();
  if (!who || !book) return false;
  return !alreadyRatedItemIds.includes(book);
}
