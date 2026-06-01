import { format, isToday, isYesterday } from 'date-fns';

/** Normalize Firestore number / Timestamp / seconds object to epoch ms. */
export function parseBehaviorNoteCreatedAt(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const withMillis = raw as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof withMillis.toMillis === 'function') {
      const ms = withMillis.toMillis();
      if (Number.isFinite(ms)) return ms;
    }
    const sec = withMillis.seconds ?? withMillis._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) return sec * 1000;
  }
  return 0;
}

export function formatBehaviorNoteDate(ms: number): string {
  if (!ms) return '';
  return format(new Date(ms), 'MMM d, yyyy');
}

export function formatBehaviorNoteTime(ms: number): string {
  if (!ms) return '';
  return format(new Date(ms), 'h:mm a');
}

/** Single-line date + time for behavior lists. */
export function formatBehaviorNoteDateTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, 'h:mm a')}`;
  return `${format(d, 'EEE, MMM d, yyyy')} · ${format(d, 'h:mm a')}`;
}
