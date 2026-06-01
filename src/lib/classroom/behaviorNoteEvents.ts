import type { BehaviorNote } from '@/lib/types';

/** Fired on `window` when a behavior note is saved (same tab). */
export const BEHAVIOR_NOTE_SAVED_EVENT = 'levelup:behavior-note-saved';

export function emitBehaviorNoteSaved(note: BehaviorNote) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BehaviorNote>(BEHAVIOR_NOTE_SAVED_EVENT, { detail: note }));
}
