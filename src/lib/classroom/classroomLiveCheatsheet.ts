export const CLASSROOM_LIVE_CHEATSHEET_KEY = 'classroom-live-quick-sheet';
export const CLASSROOM_LIVE_CHEATSHEET_EVENT = 'classroom-live-cheatsheet';

export type ClassroomLiveCheatsheetPrefs = {
  showQuickSheet: boolean;
};

const DEFAULT_PREFS: ClassroomLiveCheatsheetPrefs = {
  showQuickSheet: false,
};

export function loadClassroomLiveCheatsheetPrefs(): ClassroomLiveCheatsheetPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(CLASSROOM_LIVE_CHEATSHEET_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as { showQuickSheet?: boolean };
    return { showQuickSheet: parsed.showQuickSheet === true };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function loadClassroomLiveCheatsheetShown(): boolean {
  return loadClassroomLiveCheatsheetPrefs().showQuickSheet;
}

export function saveClassroomLiveCheatsheetPrefs(patch: Partial<ClassroomLiveCheatsheetPrefs>) {
  if (typeof window === 'undefined') return;
  const next = { ...loadClassroomLiveCheatsheetPrefs(), ...patch };
  window.localStorage.setItem(CLASSROOM_LIVE_CHEATSHEET_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CLASSROOM_LIVE_CHEATSHEET_EVENT));
}

export function saveClassroomLiveCheatsheetShown(show: boolean) {
  saveClassroomLiveCheatsheetPrefs({ showQuickSheet: show });
}

export function subscribeClassroomLiveCheatsheet(
  onChange: (prefs: ClassroomLiveCheatsheetPrefs) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handle = () => onChange(loadClassroomLiveCheatsheetPrefs());
  window.addEventListener(CLASSROOM_LIVE_CHEATSHEET_EVENT, handle);
  window.addEventListener('storage', handle);
  return () => {
    window.removeEventListener(CLASSROOM_LIVE_CHEATSHEET_EVENT, handle);
    window.removeEventListener('storage', handle);
  };
}
