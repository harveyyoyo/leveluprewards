import type { HistoryItem } from '@/lib/types';

export type StudentLibraryBookRead = {
  title: string;
  returnedAt: number;
};

const RETURNED_LIBRARY_PREFIX = /^Returned library item:\s*/i;

export function parseLibraryBookTitleFromActivity(desc: string): string | null {
  const trimmed = desc.trim();
  if (!RETURNED_LIBRARY_PREFIX.test(trimmed)) return null;
  const title = trimmed.replace(RETURNED_LIBRARY_PREFIX, '').trim();
  return title || null;
}

/** Unique books the student has returned (most recent return date per title). */
export function listStudentLibraryBooksRead(
  activities: HistoryItem[] | null | undefined,
  options?: { limit?: number },
): StudentLibraryBookRead[] {
  const limit = options?.limit ?? 30;
  const sorted = [...(activities ?? [])].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  const byTitle = new Map<string, StudentLibraryBookRead>();

  for (const item of sorted) {
    const title = parseLibraryBookTitleFromActivity(item.desc ?? '');
    if (!title) continue;
    const key = title.toLowerCase();
    if (byTitle.has(key)) continue;
    byTitle.set(key, { title, returnedAt: item.date ?? 0 });
    if (byTitle.size >= limit) break;
  }

  return [...byTitle.values()].sort((a, b) => b.returnedAt - a.returnedAt);
}
