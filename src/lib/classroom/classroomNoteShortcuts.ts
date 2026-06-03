import type { BehaviorNoteKind } from '@/lib/types';

export type ClassroomNoteShortcutKey = 'p' | 'c' | 'i' | 'w' | 'h';

export type ClassroomNoteShortcut = {
  key: ClassroomNoteShortcutKey;
  kind: BehaviorNoteKind;
  /** Matches the dialog heading — first letter is the keyboard shortcut. */
  popupTitle: string;
  hintLabel: string;
  description: string;
  placeholder: string;
  saveLabel: string;
  toastTitle: string;
  quickOptions: string[];
  showParentToggle?: boolean;
};

export const CLASSROOM_NOTE_SHORTCUTS: readonly ClassroomNoteShortcut[] = [
  {
    key: 'p',
    kind: 'positive',
    popupTitle: 'Positive note',
    hintLabel: 'Positive note',
    description: 'Celebrate something that went well. Families can see positive notes when the parent portal is on.',
    placeholder: 'What went well in class?',
    saveLabel: 'Save positive note',
    toastTitle: 'Positive note saved',
    quickOptions: [
      'Great participation',
      'Helped a classmate',
      'Strong effort today',
      'Asked a thoughtful question',
      'Showed leadership',
    ],
  },
  {
    key: 'c',
    kind: 'concern',
    popupTitle: 'Comment',
    hintLabel: 'Comment',
    description: 'A quick classroom comment for staff. Use this for neutral notes and reminders.',
    placeholder: 'Add your comment…',
    saveLabel: 'Save comment',
    toastTitle: 'Comment saved',
    quickOptions: [
      'Quick check-in',
      'Needs a reminder',
      'Off task today',
      'Talking out of turn',
      'Missing materials',
    ],
  },
  {
    key: 'i',
    kind: 'incident',
    popupTitle: 'Incident',
    hintLabel: 'Incident',
    description: 'Document a serious behavior issue. Choose whether families should see it.',
    placeholder: 'What happened?',
    saveLabel: 'Save incident',
    toastTitle: 'Incident saved',
    showParentToggle: true,
    quickOptions: [
      'Disruption during lesson',
      'Conflict with a peer',
      'Did not follow directions',
      'Left seat without permission',
      'Needed admin support',
    ],
  },
  {
    key: 'w',
    kind: 'concern',
    popupTitle: 'Warning',
    hintLabel: 'Warning',
    description: 'Record a warning before an incident. Staff-only unless you share it with families elsewhere.',
    placeholder: 'What warning was given?',
    saveLabel: 'Save warning',
    toastTitle: 'Warning saved',
    quickOptions: [
      'Final warning given today',
      'Repeated issue this week',
      'Needs parent contact',
      'Pattern of off-task behavior',
      'Redirected multiple times',
    ],
  },
  {
    key: 'h',
    kind: 'positive',
    popupTitle: 'Highlight',
    hintLabel: 'Highlight',
    description: 'Spotlight standout moments — great for end-of-lesson shout-outs.',
    placeholder: 'What stood out?',
    saveLabel: 'Save highlight',
    toastTitle: 'Highlight saved',
    quickOptions: [
      'Star of the lesson',
      'Excellent question',
      'Went above and beyond',
      'Improved from yesterday',
      'Model student today',
    ],
  },
] as const;

const SHORTCUT_BY_KEY = new Map<ClassroomNoteShortcutKey, ClassroomNoteShortcut>(
  CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => [shortcut.key, shortcut]),
);

export function isClassroomNoteShortcutKey(key: string): key is ClassroomNoteShortcutKey {
  return SHORTCUT_BY_KEY.has(key as ClassroomNoteShortcutKey);
}

export function getClassroomNoteShortcut(key: ClassroomNoteShortcutKey): ClassroomNoteShortcut {
  const shortcut = SHORTCUT_BY_KEY.get(key);
  if (!shortcut) throw new Error(`Unknown classroom note shortcut: ${key}`);
  return shortcut;
}

export function classroomNoteShortcutKeys(): ClassroomNoteShortcutKey[] {
  return CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => shortcut.key);
}

export function classroomNoteDialogTitle(shortcut: ClassroomNoteShortcut, studentLabel: string): string {
  return `${shortcut.popupTitle} — ${studentLabel}`;
}
