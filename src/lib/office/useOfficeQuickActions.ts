'use client';

const STORAGE_KEY = 'office-quick-action-counts';

export type OfficeQuickActionId =
  | 'add-student'
  | 'record-mark'
  | 'new-invoice'
  | 'record-payment'
  | 'family-profile'
  | 'reports'
  | 'import';

export type OfficeQuickAction = {
  id: OfficeQuickActionId;
  href: string;
  label: string;
  score: number;
};

type Counts = Partial<Record<OfficeQuickActionId, number>>;

function readCounts(schoolId: string): Counts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${schoolId}`);
    return raw ? (JSON.parse(raw) as Counts) : {};
  } catch {
    return {};
  }
}

export function trackOfficeQuickAction(schoolId: string, id: OfficeQuickActionId): void {
  if (typeof window === 'undefined') return;
  const counts = readCounts(schoolId);
  counts[id] = (counts[id] ?? 0) + 1;
  localStorage.setItem(`${STORAGE_KEY}-${schoolId}`, JSON.stringify(counts));
}

export function buildOfficeQuickActions(params: {
  schoolId: string;
  loginState: string;
  activeTerm: string;
  marksRecordLabel: string;
  hrefFor: (segment: '' | 'students' | 'grades' | 'billing' | 'reports' | 'settings', query?: string) => string;
}): OfficeQuickAction[] {
  const { schoolId, loginState, activeTerm, marksRecordLabel, hrefFor } = params;
  const counts = readCounts(schoolId);
  const base = (id: OfficeQuickActionId, href: string, label: string, roleBoost = 0): OfficeQuickAction => ({
    id,
    href,
    label,
    score: (counts[id] ?? 0) + roleBoost,
  });

  const all: OfficeQuickAction[] = [
    base('add-student', hrefFor('students'), 'Add student', loginState === 'office' ? 2 : 1),
    base('record-mark', hrefFor('grades', `term=${encodeURIComponent(activeTerm)}`), marksRecordLabel, 1),
    base('new-invoice', hrefFor('billing', 'action=new-invoice'), 'New invoice', loginState === 'office' ? 3 : 1),
    base('record-payment', hrefFor('billing', 'filter=open'), 'Record payment', loginState === 'office' ? 3 : 0),
    base('family-profile', hrefFor('students', 'action=family'), 'Family profile', 1),
    base('reports', hrefFor('reports'), 'Reports', 0),
    base('import', `${hrefFor('settings')}#import`, 'Import data', loginState === 'admin' ? 2 : 0),
  ];

  return all.sort((a, b) => b.score - a.score).slice(0, 4);
}

export function officeWelcomeTitle(loginState: string, userName?: string | null): string {
  const first = userName?.trim().split(/\s+/)[0];
  if (loginState === 'admin') return first ? `Welcome back, ${first}` : 'Admin overview';
  if (loginState === 'office') return first ? `Hello, ${first}` : 'Office desk';
  return first ? `Welcome, ${first}` : 'School overview';
}
