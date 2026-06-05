/** Classroom room display (projector/monitor in the room) — separate from hallway Smart Screen. */

import type { ClassroomDesign } from '@/lib/classroomSeatingChart';
import { DEFAULT_CLASSROOM_PREFS, normalizeClassroomDesign } from '@/lib/classroomSeatingChart';

export type ClassroomScreenModule =
  | 'clock'
  | 'classMessage'
  | 'sessionLeaderboard'
  | 'focusLine'
  | 'studentCount';

export type ClassroomScreenPrefs = {
  title: string;
  message: string;
  design: ClassroomDesign;
  modules: Record<ClassroomScreenModule, boolean>;
};

export const DEFAULT_CLASSROOM_SCREEN_PREFS: ClassroomScreenPrefs = {
  title: 'Our class',
  message: 'Make today count.',
  design: 'aurora',
  modules: {
    clock: true,
    classMessage: true,
    sessionLeaderboard: true,
    focusLine: true,
    studentCount: true,
  },
};

const STORAGE_PREFIX = 'levelup-classroom-screen:';

function storageKey(schoolId: string, scope: string, classId: string) {
  return `${STORAGE_PREFIX}${schoolId}:${scope}:${classId}`;
}

export function loadClassroomScreenPrefs(
  schoolId: string,
  scope: string,
  classId: string,
): ClassroomScreenPrefs {
  if (typeof window === 'undefined') return DEFAULT_CLASSROOM_SCREEN_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(schoolId, scope, classId));
    if (!raw) return DEFAULT_CLASSROOM_SCREEN_PREFS;
    const parsed = JSON.parse(raw) as Partial<ClassroomScreenPrefs>;
    return {
      ...DEFAULT_CLASSROOM_SCREEN_PREFS,
      ...parsed,
      design: normalizeClassroomDesign(parsed.design ?? DEFAULT_CLASSROOM_SCREEN_PREFS.design),
      modules: { ...DEFAULT_CLASSROOM_SCREEN_PREFS.modules, ...parsed.modules },
    };
  } catch {
    return DEFAULT_CLASSROOM_SCREEN_PREFS;
  }
}

export function saveClassroomScreenPrefs(
  schoolId: string,
  scope: string,
  classId: string,
  prefs: ClassroomScreenPrefs,
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(schoolId, scope, classId), JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

export type ClassroomScreenUrlParams = {
  schoolId: string;
  classId: string;
  scope?: string;
};

export function buildClassroomScreenUrl({
  schoolId,
  classId,
  scope,
}: ClassroomScreenUrlParams): string {
  const params = new URLSearchParams();
  params.set('classId', classId);
  if (scope) params.set('scope', scope);
  params.set('fullscreen', '1');
  const q = params.toString();
  return `/${schoolId}/classroom-screen?${q}`;
}

export function openClassroomScreenTab(params: ClassroomScreenUrlParams) {
  if (typeof window === 'undefined') return;
  const url = buildClassroomScreenUrl(params);
  const absolute = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  window.open(absolute, '_blank', 'noopener,noreferrer');
}

export const CLASSROOM_SCREEN_MODULE_LABELS: Record<
  ClassroomScreenModule,
  { label: string; description: string }
> = {
  clock: { label: 'Clock & date', description: 'Large time for the room.' },
  classMessage: { label: 'Class message', description: 'Your headline and daily note.' },
  sessionLeaderboard: {
    label: 'Session leaderboard',
    description: 'Students ranked by points earned this session.',
  },
  focusLine: { label: 'Focus for today', description: 'Rotating SEL-friendly skill line.' },
  studentCount: { label: 'Class size', description: 'Students on the seating chart.' },
};

const FOCUS_LINES = [
  'Pause, breathe once, then begin.',
  'Choose one task and give it your full attention.',
  'Use kind words, even when the work is hard.',
  'Ask for help early and listen to the answer.',
  'Celebrate progress, then take the next step.',
];

export function focusLineForDay(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return FOCUS_LINES[day % FOCUS_LINES.length] ?? FOCUS_LINES[0];
}
