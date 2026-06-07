import { prependBehaviorNoteCache } from '@/lib/classroom/behaviorNotesCache';
import type { BehaviorNote } from '@/lib/types';

/** Fired on `window` when a behavior note is saved (same tab). */
export const BEHAVIOR_NOTE_SAVED_EVENT = 'levelup:behavior-note-saved';

export function emitBehaviorNoteSaved(schoolId: string, note: BehaviorNote) {
  if (typeof window === 'undefined') return;
  prependBehaviorNoteCache(schoolId, note);
  window.dispatchEvent(new CustomEvent<BehaviorNote>(BEHAVIOR_NOTE_SAVED_EVENT, { detail: note }));
}
