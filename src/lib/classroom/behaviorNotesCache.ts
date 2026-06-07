import type { BehaviorNote } from '@/lib/types';

type CacheEntry = {
  notes: BehaviorNote[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

export function peekBehaviorNotesCache(schoolId: string): BehaviorNote[] | null {
  const sid = schoolId.trim().toLowerCase();
  if (!sid) return null;
  return cache.get(sid)?.notes ?? null;
}

export function writeBehaviorNotesCache(schoolId: string, notes: BehaviorNote[]) {
  const sid = schoolId.trim().toLowerCase();
  if (!sid) return;
  cache.set(sid, { notes, fetchedAt: Date.now() });
}

export function prependBehaviorNoteCache(schoolId: string, note: BehaviorNote) {
  const sid = schoolId.trim().toLowerCase();
  if (!sid || !note.id) return;
  const existing = cache.get(sid)?.notes ?? [];
  const rest = existing.filter((r) => r.id !== note.id);
  writeBehaviorNotesCache(
    sid,
    [note, ...rest].sort((a, b) => b.createdAt - a.createdAt),
  );
}
